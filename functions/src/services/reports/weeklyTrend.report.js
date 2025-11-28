const db = require("../../../db/models/index");
const {getGoalEntries} = require("../../../utils/goalHelpers");

/**
 * Calculates weekly completion trend for a user over a date range
 *
 * SQL/Sequelize Query Logic:
 *
 * 1. SELECT goals WHERE user_id = ? AND club_id = ? AND cadence = 'week' AND archived = false
 *    - Get all weekly goals (habits, metrics, etc.)
 *
 * 2. Generate week boundaries (Monday to Sunday) within date range
 *    - Start from Monday of the week containing startDate
 *    - Iterate week by week until endDate
 *    - CRITICAL: Only include complete weeks (weekEnd <= now)
 *    - Exclude any week that hasn't finished yet
 *
 * 3. For each complete week:
 *    - For each weekly goal:
 *      - SELECT goal_entry WHERE goal_id = ? AND user_id = ?
 *        AND occurred_at >= week_start AND occurred_at < week_end
 *      - Check if entries meet target (count or quantity)
 *      - Mark goal as completed or not for that week
 *    - Calculate completion rate: (completed_goals / total_goals) * 100
 *
 * 4. Return weekly trend data
 *    - Only includes weeks that are fully complete
 *    - Requires minimum 2+ complete weeks before returning data
 *    - Returns null/empty if insufficient data
 *
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date for the report (optional)
 * @param {Date} endDate - End date for the report (optional, defaults to now)
 * @return {Promise<Array|null>} Array of weekly trend data points, or null if insufficient data
 */
const getWeeklyTrendReport = async (userId, clubId, startDate = null, endDate = null) => {
  const now = new Date();
  const effectiveEndDate = endDate || now;

  // Default to last 8 weeks if no start date provided
  const defaultStartDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() - 56); // 8 weeks ago
    return date;
  })();
  const effectiveStartDate = startDate || defaultStartDate;

  // SQL Query 1: Get all weekly goals for this user in this club
  // SELECT * FROM goals
  // WHERE user_id = ? AND club_id = ? AND cadence = 'week' AND archived = false
  const goals = await db.Goal.findAll({
    where: {
      userId,
      clubId: parseInt(clubId),
      archived: false,
      cadence: "week",
    },
    order: [["created_at", "ASC"]],
  });

  const weeklyGoals = goals.map((g) => g.toJSON());

  if (weeklyGoals.length === 0) {
    return null; // No weekly goals
  }

  // Generate weeks in date range
  // Start from Monday of the week containing startDate
  let currentWeekStart = new Date(effectiveStartDate);
  const dayOfWeek = currentWeekStart.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysToMonday);
  currentWeekStart.setUTCHours(0, 0, 0, 0);

  const weeklyTrend = [];
  const nowTime = now.getTime();

  // Iterate through weeks, but only include complete weeks
  while (currentWeekStart <= effectiveEndDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    // CRITICAL: Only include complete weeks (weekEnd <= now)
    // Exclude any week that hasn't finished yet
    if (weekEnd.getTime() <= nowTime) {
      let completedCount = 0;
      let totalCount = 0;

      // For each weekly goal, check if it was completed this week
      for (const goal of weeklyGoals) {
        // SQL Query 2: Get entries for this week
        // SELECT * FROM goal_entry
        // WHERE goal_id = ? AND user_id = ?
        // AND occurred_at >= ? AND occurred_at < ?
        // ORDER BY occurred_at DESC
        const entries = await getGoalEntries(
            userId,
            goal.id,
            currentWeekStart,
            weekEnd,
        );

        // Check if goal was completed this week
        const completed = goal.measure === "count" ?
          entries.length >= goal.targetCount :
          entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >=
            parseFloat(goal.targetQuantity);

        totalCount++;
        if (completed) {
          completedCount++;
        }
      }

      const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      weeklyTrend.push({
        weekStart: currentWeekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        completionRate,
        completed: completedCount,
        total: totalCount,
      });
    }

    currentWeekStart = new Date(weekEnd);
  }

  // Require minimum 2+ complete weeks before returning data
  if (weeklyTrend.length < 2) {
    return []; // Not enough data - return empty array
  }

  return weeklyTrend;
};

module.exports = getWeeklyTrendReport;

