import {io} from 'socket.io-client';
import {getAuth} from 'firebase/auth';

const ENV_IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production, use relative path which will be proxied by Firebase Hosting
// In development, use local emulator
const SOCKET_URL = ENV_IS_PRODUCTION
  ? window.location.origin
  : 'http://localhost:5001/conscious-bookclub-87073-9eb71/us-central1';

let socket = null;

export const connectSocket = () => {
  if (socket?.connected) {
    return socket;
  }

  return new Promise((resolve, reject) => {
    const user = getAuth().currentUser;
    if (!user) {
      reject(new Error('User not authenticated'));
      return;
    }

    // Get Firebase Auth token
    user.getIdToken().then((token) => {
      socket = io(SOCKET_URL, {
        path: '/socket.io/',
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      socket.on('connect', () => {
        console.log('Socket.io connected');
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket.io connection error:', error);
        reject(error);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.io disconnected:', reason);
      });

      socket.on('reconnect', (attemptNumber) => {
        console.log('Socket.io reconnected after', attemptNumber, 'attempts');
        // Re-authenticate and rejoin rooms if needed
        const currentUser = getAuth().currentUser;
        if (currentUser) {
          currentUser.getIdToken().then((newToken) => {
            socket.auth.token = newToken;
            socket.disconnect().connect();
          });
        }
      });
    }).catch((error) => {
      console.error('Error getting auth token:', error);
      reject(error);
    });
  });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
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

