const express = require("express");
const http = require("http");
const {Server} = require("socket.io");
const {initializeApp, getApps} = require("firebase-admin/app");
const {getAuth} = require("firebase-admin/auth");

// Initialize Firebase Admin SDK
// Cloud Run uses default credentials, local dev can use service account or default
if (getApps().length === 0) {
  initializeApp({
    projectId: "conscious-bookclub-87073-9eb71",
    // Cloud Run will use default credentials automatically
    // For local dev, credentials are provided by gcloud auth application-default login
    // or GOOGLE_APPLICATION_CREDENTIALS env var
  });
}

// Create Express app for health check and event triggering
const app = express();

// Parse JSON bodies
app.use(express.json());

// Health check endpoint (Cloud Run requirement)
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// Endpoint for Functions to trigger Socket.io events
// This allows the Functions API to notify the Socket.io service when posts/reactions are created
app.post("/emit", (req, res) => {
  try {
    const {room, event, data} = req.body;

    if (!room || !event || !data) {
      return res.status(400).json({
        error: "Missing required fields: room, event, data",
      });
    }

    // Emit event to the specified room
    // Room format should be: "club:{clubId}"
    io.to(room).emit(event, data);

    console.log(`Emitted ${event} to ${room}`);
    res.status(200).json({success: true, room, event});
  } catch (error) {
    console.error("Error emitting event:", error);
    res.status(500).json({error: "Failed to emit event"});
  }
});

// Endpoint to check which users are currently in a room
// Used to prevent sending push notifications to users actively viewing the feed
app.post("/check-room-members", (req, res) => {
  try {
    const {room, userIds} = req.body;

    if (!room) {
      return res.status(400).json({
        error: "Missing required field: room",
      });
    }

    if (!Array.isArray(userIds)) {
      return res.status(400).json({
        error: "userIds must be an array",
      });
    }

    // Get all sockets in the room
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const userIdsInRoom = [];

    if (roomSockets) {
      // Iterate through sockets in the room and collect userIds
      for (const socketId of roomSockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId) {
          // If userIds array is provided, only include matching userIds
          // Otherwise, return all userIds in the room
          if (userIds.length === 0 || userIds.includes(socket.userId)) {
            userIdsInRoom.push(socket.userId);
          }
        }
      }
    }

    // Remove duplicates (in case a user has multiple sockets)
    const uniqueUserIdsInRoom = [...new Set(userIdsInRoom)];

    res.status(200).json({
      success: true,
      room,
      userIdsInRoom: uniqueUserIdsInRoom,
    });
  } catch (error) {
    console.error("Error checking room members:", error);
    res.status(500).json({error: "Failed to check room members"});
  }
});

// Create HTTP server
const server = http.createServer(app);

// Set keep-alive timeout for Cloud Run (60 minute limit)
server.keepAliveTimeout = 65000; // 65 seconds

// Get production domain from environment or use default
const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || 
  "https://conscious-bookclub-87073-9eb71.web.app";

// Initialize Socket.io
const io = new Server(server, {
  path: "/socket.io", // Server sees /socket.io after Hosting strips /ws
  cors: {
    origin: process.env.NODE_ENV === "production" 
      ? [PRODUCTION_DOMAIN, "https://conscious-bookclub-87073-9eb71.firebaseapp.com"]
      : true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST"],
  },
  transports: ["websocket", "polling"],
  // Cloud Run 60-minute connection limit - set timeouts accordingly
  pingInterval: 25000, // 25 seconds
  pingTimeout: 20000, // 20 seconds
});

// Rate limiting: token bucket per socket
const rateLimiters = new Map(); // socketId -> { tokens, lastRefill }

function getRateLimiter(socketId) {
  if (!rateLimiters.has(socketId)) {
    rateLimiters.set(socketId, {
      tokens: 10, // Start with 10 tokens
      lastRefill: Date.now(),
    });
  }
  return rateLimiters.get(socketId);
}

function refillTokens(limiter) {
  const now = Date.now();
  const timePassed = now - limiter.lastRefill;
  // Refill 1 token per second
  const tokensToAdd = Math.floor(timePassed / 1000);
  if (tokensToAdd > 0) {
    limiter.tokens = Math.min(10, limiter.tokens + tokensToAdd);
    limiter.lastRefill = now;
  }
}

function consumeToken(socketId) {
  const limiter = getRateLimiter(socketId);
  refillTokens(limiter);
  if (limiter.tokens > 0) {
    limiter.tokens--;
    return true;
  }
  return false;
}

function cleanupRateLimiter(socketId) {
  rateLimiters.delete(socketId);
}

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

// Connection handling
io.on("connection", (socket) => {
  console.log(`User ${socket.userId} connected (socket: ${socket.id})`);

  // Join club room with rate limiting
  socket.on("join:club", (clubId) => {
    if (!consumeToken(socket.id)) {
      console.warn(`Rate limit exceeded for socket ${socket.id}`);
      socket.emit("error", {message: "Rate limit exceeded. Please wait a moment."});
      return;
    }

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

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`User ${socket.userId} disconnected: ${reason}`);
    cleanupRateLimiter(socket.id);
  });
});

// Get port from environment (Cloud Run sets PORT automatically)
const PORT = process.env.PORT || 3001;

// Listen on 0.0.0.0 to accept connections from Cloud Run's load balancer
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Socket.io server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`   Production domain: ${PRODUCTION_DOMAIN}`);
  console.log(`   Health check: http://localhost:${PORT}/healthz`);
});

// Export for testing
module.exports = {server, io};

