const db = require("../../../../db/models/index");

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

module.exports = {
  getHealth,
};

