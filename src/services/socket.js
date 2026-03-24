import {io} from 'socket.io-client';
import {getAuth} from 'firebase/auth';
import {getAppOrigin} from 'utils/appOrigin';

const ENV_IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production, use /ws path which will be proxied by Firebase Hosting to Cloud Run
// In development, use local Socket.io server on configurable port
// Default to 3001, but can be overridden with REACT_APP_SOCKET_PORT
const SOCKET_PORT = process.env.REACT_APP_SOCKET_PORT || '3001';

// Resolve at call time so Capacitor native gets https://app.../ws, not capacitor://localhost/ws
const getSocketUrl = () => {
  if (!ENV_IS_PRODUCTION) {
    return `http://localhost:${SOCKET_PORT}`;
  }
  return (
    process.env.REACT_APP_SOCKET_SERVICE_URL ||
    `${getAppOrigin()}/ws`
  );
};

let socket = null;
let isConnecting = false;
let connectionPromise = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const connectSocket = () => {
  const socketUrl = getSocketUrl();
  console.log(`[SocketClient] connectSocket called - SOCKET_URL=${socketUrl}, ENV_IS_PRODUCTION=${ENV_IS_PRODUCTION}, REACT_APP_SOCKET_SERVICE_URL=${process.env.REACT_APP_SOCKET_SERVICE_URL}`);
  
  // If already connected, return existing socket
  if (socket?.connected) {
    console.log(`[SocketClient] Socket already connected, reusing (socket.id: ${socket.id})`);
    return Promise.resolve(socket);
  }

  // If already connecting, return the existing promise
  if (isConnecting && connectionPromise) {
    return connectionPromise;
  }

  // Reset reconnect attempts on new connection attempt
  reconnectAttempts = 0;

  isConnecting = true;
  connectionPromise = new Promise((resolve, reject) => {
    const user = getAuth().currentUser;
    if (!user) {
      isConnecting = false;
      connectionPromise = null;
      reject(new Error('User not authenticated'));
      return;
    }

    // Get Firebase Auth token
    user.getIdToken().then((token) => {
      // Clean up existing socket if it exists
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
      }

      // Path configuration:
      const socketPath = '/socket.io';

      socket = io(socketUrl, {
        path: socketPath,
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        timeout: 20000,
      });

      socket.on('connect', () => {
        console.log(`[SocketClient] ✅ Socket.io connected successfully to ${socketUrl} (socket.id: ${socket.id})`);
        reconnectAttempts = 0;
        isConnecting = false;
        connectionPromise = null;
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        reconnectAttempts++;
        const errorMsg = error.message || error.toString();
        console.error(`[SocketClient] ❌ Socket.io connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        console.error(`[SocketClient]    URL: ${socketUrl}`);
        console.error(`[SocketClient]    Port: ${SOCKET_PORT}`);
        console.error(`[SocketClient]    Error: ${errorMsg}`);
        console.error(`[SocketClient]    Make sure the Socket.io server is running on port ${SOCKET_PORT}`);
        
        // Only reject on initial connection failure, not on reconnection attempts
        if (!socket.connected && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('[SocketClient] ❌ Max reconnection attempts reached. Giving up.');
          console.error(`[SocketClient]    Failed to connect to ${socketUrl} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
          isConnecting = false;
          connectionPromise = null;
          reject(error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log(`[SocketClient] Socket.io disconnected: ${reason} (socket.id: ${socket?.id || 'unknown'})`);
        if (reason === 'io server disconnect') {
          // Server disconnected the socket, Socket.io will automatically reconnect
          // No manual action needed
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`[SocketClient] ✅ Socket.io reconnected to ${socketUrl} after ${attemptNumber} attempts (socket.id: ${socket.id})`);
        reconnectAttempts = 0;
        
        // Update auth token on reconnect (Socket.io already reconnected, don't manually reconnect)
        const currentUser = getAuth().currentUser;
        if (currentUser) {
          currentUser.getIdToken()
            .then((newToken) => {
              // Update token for future reconnections
              socket.auth.token = newToken;
              console.log('[SocketClient] Auth token refreshed on reconnect');
            })
            .catch((error) => {
              console.error('[SocketClient] Error refreshing auth token on reconnect:', error);
            });
        }
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`[SocketClient] 🔄 Socket.io reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS} to ${socketUrl}`);
      });

      socket.on('reconnect_failed', () => {
        console.error(`[SocketClient] ❌ Socket.io reconnection failed after all attempts to ${socketUrl}`);
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
      });
    }).catch((error) => {
      console.error('[SocketClient] Error getting auth token:', error);
      isConnecting = false;
      connectionPromise = null;
      reject(error);
    });
  });

  return connectionPromise;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  isConnecting = false;
  connectionPromise = null;
  reconnectAttempts = 0;
};

export const joinClubRoom = (clubId) => {
  if (!socket || !socket.connected) {
    console.warn(`[SocketClient] Cannot join room club:${clubId} - socket not connected (socket=${!!socket}, connected=${socket?.connected})`);
    return;
  }
  console.log(`[SocketClient] Joining room club:${clubId} (socket.id: ${socket.id}, connected: ${socket.connected})`);
  
  // Add a one-time listener to confirm room join (if server supports it)
  socket.emit('join:club', clubId, (response) => {
    if (response && response.error) {
      console.error(`[SocketClient] Failed to join room club:${clubId}:`, response.error);
    } else {
      console.log(`[SocketClient] ✅ Successfully joined room club:${clubId}`);
    }
  });
};

export const leaveClubRoom = (clubId) => {
  if (!socket || !socket.connected) {
    console.warn(`[SocketClient] Cannot leave room club:${clubId} - socket not connected`);
    return;
  }
  console.log(`[SocketClient] Leaving room club:${clubId} (socket.id: ${socket.id})`);
  socket.emit('leave:club', clubId);
};

export const getSocket = () => socket;

export default {
  connectSocket,
  disconnectSocket,
  joinClubRoom,
  leaveClubRoom,
  getSocket,
};

