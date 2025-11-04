const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const dbService = require("../services/databaseService");

// Health check endpoint for database connectivity
router.get("/health", async (req, res) => {
  let connectedToDatabase = false;
  let databaseType = "unknown";
  let error = null;

  try {
    // Test PostgreSQL connection via Sequelize
    const postgresService = require("../services/postgresService");
    await postgresService.initializeDatabase();
    connectedToDatabase = true;
    databaseType = "postgresql";
    console.log("PostgreSQL connection has been established successfully.");
  } catch (err) {
    console.error("Unable to connect to the database:", err);
    error = err.message;
  }

  const healthStatus = {
    status: connectedToDatabase ? "OK" : "ERROR",
    timestamp: new Date().toISOString(),
    database: {
      type: databaseType,
      connected: connectedToDatabase,
    },
  };

  if (error) {
    healthStatus.error = error;
  }

  const statusCode = connectedToDatabase ? 200 : 500;
  res.status(statusCode).json(healthStatus);
});

// GET /v1/stats/users/:userId - Get user stats
router.get("/users/:userId", async (req, res) => {
  try {
    const {userId} = req.params;
    const stats = await dbService.getUserStats(userId);

    if (!stats) {
      return res.status(404).json({error: "User stats not found"});
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({error: "Failed to fetch user stats"});
  }
});

// GET /v1/stats/books/:bookId - Get book stats
router.get("/books/:bookId", async (req, res) => {
  try {
    const {bookId} = req.params;
    const stats = await dbService.getBookStats(bookId);

    if (!stats) {
      return res.status(404).json({error: "Book stats not found"});
    }

    res.json(stats);
  } catch (error) {
    console.error("Error fetching book stats:", error);
    res.status(500).json({error: "Failed to fetch book stats"});
  }
});

// GET /v1/stats/leaderboard - Get leaderboard
router.get("/leaderboard", async (req, res) => {
  try {
    const {limit = 10} = req.query;
    const leaderboard = await dbService.getTopFinishedBooksUsers(parseInt(limit));
    res.json(leaderboard);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    res.status(500).json({error: "Failed to fetch leaderboard"});
  }
});

module.exports = router;
