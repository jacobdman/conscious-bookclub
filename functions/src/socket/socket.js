const {Server} = require("socket.io");
const {getAuth} = require("firebase-admin/auth");

// Use global singleton pattern to persist across module reloads
let io = null;

const initializeSocket = (server) => {
  // Check global first (persists across module reloads)
  if (global.socketIO) {
    console.log("Using existing Socket.io instance from global");
    return global.socketIO;
  }

  // Check module-level cache
  if (io) {
    return io;
  }

  // Create new Socket.io instance
  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

  // Store in global for persistence
  global.socketIO = io;

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error("Authentication token required"));
      }

      // Verify Firebase Auth token
      const decodedToken = await getAuth().verifyIdToken(token);
      socket.userId = decodedToken.uid;
      next();
    } catch (error) {
      console.error("Socket authentication error:", error);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User ${socket.userId} connected`);

    // Join club room
    socket.on("join:club", (clubId) => {
      const room = `club:${clubId}`;
      socket.join(room);
      console.log(`User ${socket.userId} joined room ${room}`);
    });

    // Leave club room
    socket.on("leave:club", (clubId) => {
      const room = `club:${clubId}`;
      socket.leave(room);
      console.log(`User ${socket.userId} left room ${room}`);
    });

    socket.on("disconnect", () => {
      console.log(`User ${socket.userId} disconnected`);
    });
  });

  return io;
};

const getIO = () => {
  // Check global first (persists across module reloads)
  if (global.socketIO) {
    return global.socketIO;
  }

  // Check module-level cache
  if (io) {
    return io;
  }

  // Fallback: Initialize a minimal server if not already initialized
  // This should rarely happen as socketFunction.js should initialize it first
  console.warn("Socket.io not initialized, creating fallback instance");
  const http = require("http");
  const server = http.createServer();
  return initializeSocket(server);
};

module.exports = {
  initializeSocket,
  getIO,
};

