const {Server} = require("socket.io");
const {getAuth} = require("firebase-admin/auth");

let io = null;

const initializeSocket = (server) => {
  if (io) {
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
      methods: ["GET", "POST"],
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"],
  });

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
  if (!io) {
    // Initialize a minimal server if not already initialized
    // This is a fallback for when Socket.io is accessed before server setup
    const http = require("http");
    const server = http.createServer();
    return initializeSocket(server);
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};

