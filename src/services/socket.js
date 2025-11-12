import {io} from 'socket.io-client';
import {getAuth} from 'firebase/auth';

const ENV_IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production, use /ws path which will be proxied by Firebase Hosting to Cloud Run
// In development, use local Socket.io server on configurable port
// Default to 3001, but can be overridden with REACT_APP_SOCKET_PORT
const SOCKET_PORT = process.env.REACT_APP_SOCKET_PORT || '3001';

// Allow direct connection to Cloud Run service via environment variable
// If REACT_APP_SOCKET_SERVICE_URL is set, use it directly
// Otherwise, use /ws path (Firebase Hosting rewrite) in production
const SOCKET_URL = process.env.REACT_APP_SOCKET_SERVICE_URL
  ? process.env.REACT_APP_SOCKET_SERVICE_URL
  : ENV_IS_PRODUCTION
  ? `${window.location.origin}/ws`  // Firebase Hosting rewrites /ws/** to Cloud Run
  : `http://localhost:${SOCKET_PORT}`;

let socket = null;
let isConnecting = false;
let connectionPromise = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export const connectSocket = () => {
  // If already connected, return existing socket
  if (socket?.connected) {
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

      socket = io(SOCKET_URL, {
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
        console.log(`✅ Socket.io connected successfully to ${SOCKET_URL}`);
        reconnectAttempts = 0;
        isConnecting = false;
        connectionPromise = null;
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        reconnectAttempts++;
        const errorMsg = error.message || error.toString();
        console.error(`❌ Socket.io connection error (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        console.error(`   URL: ${SOCKET_URL}`);
        console.error(`   Port: ${SOCKET_PORT}`);
        console.error(`   Error: ${errorMsg}`);
        console.error(`   Make sure the Socket.io server is running on port ${SOCKET_PORT}`);
        
        // Only reject on initial connection failure, not on reconnection attempts
        if (!socket.connected && reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.error('❌ Max reconnection attempts reached. Giving up.');
          console.error(`   Failed to connect to ${SOCKET_URL} after ${MAX_RECONNECT_ATTEMPTS} attempts`);
          isConnecting = false;
          connectionPromise = null;
          reject(error);
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server disconnected the socket, Socket.io will automatically reconnect
          // No manual action needed
        }
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log(`✅ Socket.io reconnected to ${SOCKET_URL} after ${attemptNumber} attempts`);
        reconnectAttempts = 0;
        
        // Update auth token on reconnect (Socket.io already reconnected, don't manually reconnect)
        const currentUser = getAuth().currentUser;
        if (currentUser) {
          currentUser.getIdToken()
            .then((newToken) => {
              // Update token for future reconnections
              socket.auth.token = newToken;
              console.log('Auth token refreshed on reconnect');
            })
            .catch((error) => {
              console.error('Error refreshing auth token on reconnect:', error);
            });
        }
      });

      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`🔄 Socket.io reconnection attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS} to ${SOCKET_URL}`);
      });

      socket.on('reconnect_failed', () => {
        console.error(`❌ Socket.io reconnection failed after all attempts to ${SOCKET_URL}`);
        reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
      });
    }).catch((error) => {
      console.error('Error getting auth token:', error);
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
    console.warn('Socket not connected, cannot join room');
    return;
  }
  socket.emit('join:club', clubId);
};

export const leaveClubRoom = (clubId) => {
  if (!socket || !socket.connected) {
    return;
  }
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

