const {onRequest} = require("firebase-functions/v2/https");
const {initializeSocket} = require("./socket");
const http = require("http");

// Check if we're running in the emulator (local development)
const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" || 
                   process.env.GCLOUD_PROJECT === "demo-test" ||
                   !process.env.GCLOUD_PROJECT;

// Lazy initialization: only start server when actually needed
// This prevents multiple initialization attempts when module reloads
let serverInitialized = false;

function ensureSocketServer() {
  // CRITICAL: Check if server already exists and is listening FIRST
  // This must happen before creating any new server instances
  if (global.socketServer && global.socketServer.listening) {
    console.log("✅ Socket.io server already running (reusing existing instance)");
    return {
      server: global.socketServer,
      io: global.socketIO,
    };
  }

  // Prevent concurrent initialization attempts
  if (serverInitialized) {
    // Another initialization is in progress, wait and check again
    if (global.socketServer && global.socketServer.listening) {
      return {
        server: global.socketServer,
        io: global.socketIO,
      };
    }
    // If still not listening, something went wrong, allow retry
    serverInitialized = false;
  }

  serverInitialized = true;

  // Check if server exists but is not listening
  if (global.socketServer && !global.socketServer.listening) {
    console.log("⚠️  Socket.io server exists but not listening, cleaning up...");
    try {
      global.socketServer.close();
    } catch (err) {
      // Ignore errors when closing
    }
    global.socketServer = null;
    global.socketIO = null;
  }

  // Store references to existing server/io before potentially creating new ones
  // This allows us to restore them if we get EADDRINUSE (port already in use)
  const existingServer = global.socketServer;
  const existingIO = global.socketIO;
  
  // Create new server instance
  const server = http.createServer();
  const io = initializeSocket(server);

  // Store in global for persistence across module reloads
  global.socketServer = server;
  global.socketIO = io;

  if (isEmulator) {
    // Start listening on a specific port for local development
    const PORT = process.env.SOCKET_PORT || 3001;
    
    // Check if port is already in use before attempting to listen
    // This is a best-effort check - the actual listen() call will still error if port is in use
    if (!server.listening) {
      try {
        server.listen(PORT, "0.0.0.0", () => {
          serverInitialized = false; // Reset flag on success
          console.log(`✅ Socket.io server running on port ${PORT} (local development)`);
          console.log(`   Connect to: http://localhost:${PORT}`);
          console.log(`   Using production Firebase Auth (no emulator)`);
        });
        
        // Handle listen errors gracefully
        server.once("error", (err) => {
          serverInitialized = false; // Reset flag on error so we can retry
          if (err.code === "EADDRINUSE") {
            // Port is in use - this is expected if module reloaded and server is already running
            // Restore the existing server/io instances we had before creating new ones
            if (existingServer && existingIO) {
              console.log("✅ Socket.io server already running (restoring existing instance after module reload)");
              global.socketServer = existingServer;
              global.socketIO = existingIO;
            } else {
              // Port is in use but we don't have existing server reference
              // This is expected in emulator mode when module reloads
              // The server from previous module load is still running
              // Silently continue - the server is working, we just can't track it in this module instance
              // Next call to ensureSocketServer() should find it via global (if it persisted)
              console.log(`ℹ️  Port ${PORT} is in use (likely from previous module load). Server should still be accessible.`);
            }
          } else if (err.syscall === "listen") {
            console.error(`❌ Error starting Socket.io server on port ${PORT}:`, err.message);
          }
        });
      } catch (err) {
        serverInitialized = false;
        console.error("❌ Error starting Socket.io server:", err);
      }
    } else {
      serverInitialized = false;
      console.log("⚠️  Socket.io server already listening");
    }
  } else {
    // For production, don't listen (Firebase Functions handles this)
    serverInitialized = false;
    console.log("Socket.io initialized for production");
  }

  return {server, io};
}

// Export Socket.io function for Firebase Functions
// Initialize server lazily when function is first called, not at module load
exports.socket = onRequest({
  cors: true,
}, (req, res) => {
  // Lazy initialization: only start server when function is actually called
  const {io} = ensureSocketServer();
  
  // Health check endpoint
  res.status(200).json({
    message: "Socket.io endpoint",
    connected: io ? io.engine.clientsCount : 0,
    listening: global.socketServer ? global.socketServer.listening : false,
  });
});

// Initialize server immediately for local development (so it's ready when clients connect)
// The ensureSocketServer() function handles duplicate initialization gracefully
if (isEmulator) {
  // Initialize immediately - the function will check if server already exists
  ensureSocketServer();
}

// Store the io instance globally so controllers can use it
// Use getter function to ensure it's initialized
Object.defineProperty(module.exports, "io", {
  get: function() {
    const {io} = ensureSocketServer();
    return io;
  },
});
