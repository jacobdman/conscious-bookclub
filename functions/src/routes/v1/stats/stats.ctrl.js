const db = require("../../../../db/models/index");

// TODO: Remove this controller (move all stats to books/goals controllers)

// Health check endpoint for database connectivity
const getHealth = async (req, res, next) => {
  try {
    let connectedToDatabase = false;
    let databaseType = "unknown";
    let error = null;

    try {
      // Test PostgreSQL connection via Sequelize
      await db.sequelize.authenticate();
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
  } catch (e) {
    next(e);
  }
};

// GET /v1/stats/users/:userId - Get user stats
const getUserStats = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const finishedCount = await db.BookProgress.count({
      where: {userId, status: "finished"},
    });

    const lastFinished = await db.BookProgress.findOne({
      where: {userId, status: "finished"},
      order: [["updated_at", "DESC"]],
    });

    const user = await db.User.findByPk(userId);

    const stats = {
      id: userId,
      finishedCount,
      lastFinishedAt: lastFinished?.updatedAt,
      displayName: user?.displayName || "Unknown User",
      photoUrl: user?.photoUrl,
    };

    if (!stats) {
      const error = new Error("User stats not found");
      error.status = 404;
      throw error;
    }

    res.json(stats);
  } catch (e) {
    next(e);
  }
};

// GET /v1/stats/books/:bookId - Get book stats
const getBookStats = async (req, res, next) => {
  try {
    const {bookId} = req.params;
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      const error = new Error("Invalid book ID");
      error.status = 400;
      throw error;
    }

    const stats = await db.BookProgress.findAll({
      attributes: [
        "status",
        [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
        [db.sequelize.fn("AVG", db.sequelize.col("percent_complete")), "avgPercent"],
      ],
      where: {bookId: bookIdInt},
      group: ["status"],
    });

    let activeReaders = 0;
    let finishedReaders = 0;
    let avgPercent = 0;
    let readerCount = 0;

    stats.forEach((stat) => {
      const count = parseInt(stat.dataValues.count);
      readerCount += count;

      if (stat.status === "reading") {
        activeReaders = count;
      } else if (stat.status === "finished") {
        finishedReaders = count;
      }

      if (stat.dataValues.avgPercent) {
        avgPercent = parseFloat(stat.dataValues.avgPercent);
      }
    });

    const result = {
      id: bookIdInt,
      activeReaders,
      finishedReaders,
      readerCount,
      avgPercent: Math.round(avgPercent * 100) / 100,
    };

    if (!result) {
      const error = new Error("Book stats not found");
      error.status = 404;
      throw error;
    }

    res.json(result);
  } catch (e) {
    next(e);
  }
};

// GET /v1/stats/leaderboard - Get leaderboard
const getLeaderboard = async (req, res, next) => {
  try {
    const {limit = 10} = req.query;
    const limitCount = parseInt(limit);

    const results = await db.BookProgress.findAll({
      attributes: [
        "userId",
        [db.sequelize.fn("COUNT", db.sequelize.col("BookProgress.id")), "finishedCount"],
      ],
      where: {status: "finished"},
      group: [
        "userId",
        "User.uid",
        "User.display_name",
        "User.photo_url",
      ],
      order: [[db.sequelize.fn("COUNT", db.sequelize.col("BookProgress.id")), "DESC"]],
      limit: limitCount,
      include: [{
        model: db.User,
        attributes: ["uid", "displayName", "photoUrl"],
        required: true,
      }],
    });

    const leaderboard = results.map((result) => ({
      id: result.userId,
      finishedCount: parseInt(result.dataValues.finishedCount),
      displayName: result.User?.displayName || "Unknown User",
      photoUrl: result.User?.photoUrl,
    }));

    res.json(leaderboard);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getHealth,
  getUserStats,
  getBookStats,
  getLeaderboard,
};

