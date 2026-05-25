const express = require("express");
const {
  getHabitConsistency,
  getWeeklyTrend,
  getHabitStreak,
  getLeaderboard,
  getWeeklyTrendByMember,
  getGoalTypeDistribution,
  getWeeklyGoalsBreakdown,
  getClubGoalProgress,
  getClubGoalMemberBreakdown,
  getClubGoalOverview,
  getClubGoalEntries,
} = require("./reports.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/habit-consistency", getHabitConsistency)
    .get("/weekly-trend", getWeeklyTrend)
    .get("/habit-streak", getHabitStreak)
    .get("/leaderboard", getLeaderboard)
    .get("/weekly-trend-by-member", getWeeklyTrendByMember)
    .get("/goal-type-distribution", getGoalTypeDistribution)
    .get("/weekly-goals-breakdown", getWeeklyGoalsBreakdown)
    .get("/club-goal-progress", getClubGoalProgress)
    .get("/club-goal-member-breakdown", getClubGoalMemberBreakdown)
    .get("/club-goal-overview", getClubGoalOverview)
    .get("/club-goal-entries", getClubGoalEntries);

module.exports = router;

