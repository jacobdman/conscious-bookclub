require("dotenv").config();
const {initializeApp} = require("firebase-admin/app");
const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

// Initialize Firebase Admin
initializeApp();

// Create Express app for API
const app = express();

// CORS: Allow all origins (including localhost for emulator)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Import route handlers
const routes = require("./src/routes");

// Initialize PostgreSQL database connection
const db = require("./db/models/index");
db.sequelize.authenticate().then(() => {
  console.log("PostgreSQL connection established successfully.");
}).catch((error) => {
  console.error("Unable to connect to PostgreSQL:", error);
});

// Health check endpoint (before routes to avoid conflicts)
app.get("/health", async (req, res) => {
  const healthStatus = {
    status: "OK",
    timestamp: new Date().toISOString(),
    database: "unknown",
  };

  try {
    // Test PostgreSQL connection via Sequelize
    await db.sequelize.authenticate();
    healthStatus.database = "postgresql_connected";

    res.json(healthStatus);
  } catch (error) {
    console.error("Health check failed:", error);
    healthStatus.status = "ERROR";
    healthStatus.database = "connection_failed";
    healthStatus.error = error.message;
    res.status(500).json(healthStatus);
  }
});

// Mount routes
app.use("/", routes);

// Error handling middleware (must be after routes)
app.use((err, req, res, next) => {
  console.log("ERROR HANDLER", req.url);
  console.error(err);

  // Ensure CORS headers are set even on errors
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");

  res.status(err.status || 500);
  // Return error as string to match frontend expectations
  res.json({
    error: err.message || "An unexpected error occurred",
  });
});

// Export the API function with CORS enabled
exports.api = onRequest(app);
