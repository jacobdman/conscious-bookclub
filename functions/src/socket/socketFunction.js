const {onRequest} = require("firebase-functions/v2/https");
const {initializeSocket} = require("./socket");
const http = require("http");

// Create HTTP server for Socket.io
const server = http.createServer();
const io = initializeSocket(server);

// Export Socket.io function
exports.socket = onRequest({
  cors: true,
}, (req, res) => {
  // This is a workaround - Socket.io needs its own server
  // In production, you might want to use a different approach
  // For now, we'll handle Socket.io connections through a separate mechanism
  res.status(200).json({message: "Socket.io endpoint"});
});

// Store the io instance globally so controllers can use it
module.exports.io = io;

