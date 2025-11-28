const express = require("express");
const {
  getHabitConsistency,
  getWeeklyTrend,
  getHabitStreak,
  getLeaderboard,
  getGoalTypeDistribution,
  getWeeklyGoalsBreakdown,
} = require("./reports.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
  .get("/habit-consistency", getHabitConsistency)
  .get("/weekly-trend", getWeeklyTrend)
  .get("/habit-streak", getHabitStreak)
  .get("/leaderboard", getLeaderboard)
  .get("/goal-type-distribution", getGoalTypeDistribution)
  .get("/weekly-goals-breakdown", getWeeklyGoalsBreakdown);

module.exports = router;

