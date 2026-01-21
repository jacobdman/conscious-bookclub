const {
  habitConsistencyReport,
  weeklyTrendReport,
  habitStreakReport,
  leaderboardReport,
  goalTypeDistributionReport,
  weeklyGoalsBreakdownReport,
} = require("../../../services/reports");

// GET /v1/reports/habit-consistency?userId=xxx&clubId=xxx&startDate=xxx&endDate=xxx
const getHabitConsistency = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const clubId = req.query.clubId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    const result = await habitConsistencyReport(userId, clubId, startDate, endDate);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// GET /v1/reports/weekly-trend?userId=xxx&clubId=xxx&startDate=xxx&endDate=xxx
const getWeeklyTrend = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const clubId = req.query.clubId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    const result = await weeklyTrendReport(userId, clubId, startDate, endDate);
    // Return empty array if null (not enough data)
    res.json({weeklyTrend: result || []});
  } catch (e) {
    next(e);
  }
};

// GET /v1/reports/habit-streak?userId=xxx&clubId=xxx&startDate=xxx&endDate=xxx
const getHabitStreak = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const clubId = req.query.clubId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    const result = await habitStreakReport(userId, clubId, startDate, endDate);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// GET /v1/reports/leaderboard?clubId=xxx&userId=xxx&startDate=xxx&endDate=xxx
const getLeaderboard = async (req, res, next) => {
  try {
    const clubId = req.query.clubId;
    const userId = req.query.userId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const timezone = req.query.timezone || null;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const result = await leaderboardReport(clubId, userId, startDate, endDate, timezone);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// GET /v1/reports/goal-type-distribution?userId=xxx&clubId=xxx&forClub=true
const getGoalTypeDistribution = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const clubId = req.query.clubId;
    const forClub = req.query.forClub === "true";

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    if (!forClub && !userId) {
      const error = new Error("userId is required when forClub is false");
      error.status = 400;
      throw error;
    }

    const result = await goalTypeDistributionReport(userId, clubId, forClub);
    res.json({goalTypeDistribution: result});
  } catch (e) {
    next(e);
  }
};

// GET /v1/reports/weekly-goals-breakdown?userId=xxx&clubId=xxx&startDate=xxx&endDate=xxx
const getWeeklyGoalsBreakdown = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const clubId = req.query.clubId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    const result = await weeklyGoalsBreakdownReport(userId, clubId, startDate, endDate);
    res.json(result);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getHabitConsistency,
  getWeeklyTrend,
  getHabitStreak,
  getLeaderboard,
  getGoalTypeDistribution,
  getWeeklyGoalsBreakdown,
};

