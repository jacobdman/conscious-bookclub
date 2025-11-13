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

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[SocketServer] Incoming request: ${req.method} ${req.path}`);
  next();
});

// Parse JSON bodies
app.use(express.json());

// Health check endpoint (Cloud Run requirement)
app.get("/healthz", (req, res) => {
  res.status(200).send("ok");
});

// Endpoint for Functions to trigger Socket.io events
// This allows the Functions API to notify the Socket.io service when posts/reactions are created
app.post("/emit", (req, res) => {
  console.log(`[SocketServer] /emit endpoint hit - method: ${req.method}, path: ${req.path}`);
  try {
    const {room, event, data} = req.body;

    if (!room || !event || !data) {
      console.log(`[SocketServer] /emit - Missing required fields: room=${!!room}, event=${!!event}, data=${!!data}`);
      return res.status(400).json({
        error: "Missing required fields: room, event, data",
      });
    }

    // Check room membership before emitting
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const memberCount = roomSockets ? roomSockets.size : 0;
    
    // Log detailed room information for debugging
    const socketIdsInRoom = roomSockets ? Array.from(roomSockets) : [];
    const userIdsInRoom = [];
    if (roomSockets) {
      for (const socketId of socketIdsInRoom) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket && socket.userId) {
          userIdsInRoom.push(socket.userId);
        }
      }
    }
    
    console.log(`[SocketServer] /emit - Received request: event=${event}, room=${room}, members=${memberCount}`);
    if (memberCount > 0) {
      console.log(`[SocketServer] /emit - Room members: socketIds=[${socketIdsInRoom.join(', ')}], userIds=[${userIdsInRoom.join(', ')}]`);
    } else {
      console.log(`[SocketServer] /emit - WARNING: Room ${room} has 0 members! Event will not be delivered.`);
    }
    
    // Log data summary (avoid logging full data to prevent log spam)
    const dataSummary = event === 'post:created' 
      ? `postId=${data.id || 'unknown'}`
      : event === 'reaction:added' || event === 'reaction:removed'
      ? `postId=${data.postId || 'unknown'}`
      : 'data received';

    // Emit event to the specified room
    // Room format should be: "club:{clubId}"
    io.to(room).emit(event, data);

    console.log(`[SocketServer] Emitted ${event} to ${room} (${memberCount} members) - ${dataSummary}`);
    res.status(200).json({success: true, room, event, memberCount});
  } catch (error) {
    console.error("[SocketServer] Error emitting event:", error);
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

// Catch-all route for debugging (should not be hit if routes are set up correctly)
app.use((req, res) => {
  console.log(`[SocketServer] ⚠️ Unhandled route: ${req.method} ${req.path}`);
  res.status(404).json({error: `Route not found: ${req.method} ${req.path}`});
});

// Create HTTP server
const server = http.createServer(app);

// Set keep-alive timeout for Cloud Run (60 minute limit)
server.keepAliveTimeout = 65000; // 65 seconds

// Get production domain from environment or use default
const PRODUCTION_DOMAIN = process.env.PRODUCTION_DOMAIN || 
  "https://conscious-bookclub-87073-9eb71.web.app";

// Allowed origins for CORS in production
const ALLOWED_ORIGINS = process.env.NODE_ENV === "production" 
  ? [
      PRODUCTION_DOMAIN,
      "https://conscious-bookclub-87073-9eb71.firebaseapp.com",
      "https://cbc.jacobdayton.com", // Custom domain
    ]
  : true; // Allow all origins in development

// Initialize Socket.io
const io = new Server(server, {
  path: "/socket.io", // Server sees /socket.io after Hosting strips /ws
  cors: {
    origin: ALLOWED_ORIGINS,
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
  console.log(`[SocketServer] ✅ User ${socket.userId} connected (socket: ${socket.id})`);
  console.log(`[SocketServer] Total connected sockets: ${io.sockets.sockets.size}`);

  // Join club room with rate limiting
  socket.on("join:club", (clubId, callback) => {
    console.log(`[SocketServer] Received join:club request from user ${socket.userId} (socket: ${socket.id}) for club ${clubId}`);
    
    if (!consumeToken(socket.id)) {
      console.warn(`[SocketServer] ⚠️ Rate limit exceeded for socket ${socket.id} (user: ${socket.userId})`);
      if (typeof callback === 'function') {
        callback({error: "Rate limit exceeded. Please wait a moment."});
      } else {
        socket.emit("error", {message: "Rate limit exceeded. Please wait a moment."});
      }
      return;
    }

    const room = `club:${clubId}`;
    socket.join(room);
    
    // Get room size after join
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const memberCount = roomSockets ? roomSockets.size : 0;
    
    // Get all socket IDs in the room for debugging
    const socketIdsInRoom = roomSockets ? Array.from(roomSockets) : [];
    
    console.log(`[SocketServer] ✅ User ${socket.userId} joined room ${room} (${memberCount} total members)`);
    console.log(`[SocketServer] Room ${room} socket IDs: [${socketIdsInRoom.join(', ')}]`);
    
    // Send confirmation callback if provided
    if (typeof callback === 'function') {
      callback({success: true, room, memberCount});
    }
  });

  // Leave club room
  socket.on("leave:club", (clubId) => {
    const room = `club:${clubId}`;
    socket.leave(room);
    
    // Get room size after leave
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const memberCount = roomSockets ? roomSockets.size : 0;
    
    console.log(`[SocketServer] User ${socket.userId} left room ${room} (${memberCount} remaining members)`);
  });

  // Handle disconnection
  socket.on("disconnect", (reason) => {
    console.log(`[SocketServer] ❌ User ${socket.userId} disconnected: ${reason} (socket: ${socket.id})`);
    console.log(`[SocketServer] Remaining connected sockets: ${io.sockets.sockets.size}`);
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
  console.log(`   Emit endpoint: http://localhost:${PORT}/emit`);
  console.log(`   Express routes registered: GET /healthz, POST /emit, POST /check-room-members`);
});

// Export for testing
module.exports = {server, io};

