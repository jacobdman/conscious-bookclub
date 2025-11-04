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
}));
app.use(express.json());

// Import route handlers
const booksRouter = require("./routes/books");
const goalsRouter = require("./routes/goals");
const postsRouter = require("./routes/posts");
const usersRouter = require("./routes/users");
const progressRouter = require("./routes/progress");
const statsRouter = require("./routes/stats");
const meetingsRouter = require("./routes/meetings");

// Initialize PostgreSQL database
const postgresService = require("./services/postgresService");
postgresService.initializeDatabase().catch(console.error);

// Mount all v1 routes
const v1Router = new express.Router();
v1Router.use("/books", booksRouter);
v1Router.use("/goals", goalsRouter);
v1Router.use("/posts", postsRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/progress", progressRouter);
v1Router.use("/stats", statsRouter);
v1Router.use("/meetings", meetingsRouter);

app.use("/v1", v1Router);

// Health check endpoint
app.get("/health", async (req, res) => {
  const healthStatus = {
    status: "OK",
    timestamp: new Date().toISOString(),
    database: "unknown",
  };

  try {
    // Test PostgreSQL connection via Sequelize
    const postgresService = require("./services/postgresService");
    await postgresService.initializeDatabase();
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

// Export the API function
exports.api = onRequest(app);
