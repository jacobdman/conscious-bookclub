const db = require("../../../db/models/index");
const {getGoalEntries} = require("../../../utils/goalHelpers");

/**
 * Calculates detailed week-by-week breakdown of individual goals
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
 *      - Calculate actual vs target
 *      - Determine completion status
 *      - Get all entries with dates
 *      - Calculate completion percentage
 *    - Calculate overall completion rate for the week
 *
 * 4. Return detailed breakdown with goal-level information
 *
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date for the report (optional)
 * @param {Date} endDate - End date for the report (optional, defaults to now)
 * @return {Promise<Object>} Weekly breakdown with goal-level details
 */
const getWeeklyGoalsBreakdownReport = async (userId, clubId, startDate = null, endDate = null) => {
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
    return {weeklyBreakdown: []};
  }

  // Generate weeks in date range
  // Start from Monday of the week containing startDate
  let currentWeekStart = new Date(effectiveStartDate);
  const dayOfWeek = currentWeekStart.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysToMonday);
  currentWeekStart.setUTCHours(0, 0, 0, 0);

  const weeklyBreakdown = [];
  const nowTime = now.getTime();

  // Iterate through weeks, but only include complete weeks
  while (currentWeekStart <= effectiveEndDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    // CRITICAL: Only include complete weeks (weekEnd <= now)
    // Exclude any week that hasn't finished yet
    if (weekEnd.getTime() <= nowTime) {
      const weekGoals = [];
      let completedCount = 0;
      let totalCount = 0;

      // For each weekly goal, get detailed breakdown
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

        // Calculate actual vs target
        let actualCount = 0;
        let actualQuantity = 0;
        let completed = false;
        let completionPercentage = 0;

        if (goal.measure === "count") {
          actualCount = entries.length;
          const targetCount = goal.targetCount || 0;
          completed = actualCount >= targetCount;
          completionPercentage = targetCount > 0 ? (actualCount / targetCount) * 100 : 0;
        } else {
          // quantity-based goal
          actualQuantity = entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0);
          const targetQuantity = parseFloat(goal.targetQuantity) || 0;
          completed = actualQuantity >= targetQuantity;
          completionPercentage = targetQuantity > 0 ? (actualQuantity / targetQuantity) * 100 : 0;
        }

        // Format entries with dates
        const formattedEntries = entries.map((entry) => ({
          date: new Date(entry.occurredAt || entry.occurred_at).toISOString().split("T")[0],
          quantity: parseFloat(entry.quantity) || 1,
          occurredAt: entry.occurredAt || entry.occurred_at,
        }));

        // Calculate missed dates (only for count-based goals where we can determine expected dates)
        // For now, we'll just show the entries that were made
        // Missed dates calculation could be enhanced based on goal-specific logic

        weekGoals.push({
          goalId: goal.id,
          title: goal.title,
          type: goal.type,
          measure: goal.measure,
          targetCount: goal.targetCount,
          targetQuantity: goal.targetQuantity ? parseFloat(goal.targetQuantity) : null,
          unit: goal.unit,
          actualCount,
          actualQuantity,
          completed,
          completionPercentage: Math.min(completionPercentage, 100), // Cap at 100%
          entries: formattedEntries,
        });

        totalCount++;
        if (completed) {
          completedCount++;
        }
      }

      const overallCompletionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      weeklyBreakdown.push({
        weekStart: currentWeekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        goals: weekGoals,
        overallCompletionRate: parseFloat(overallCompletionRate.toFixed(1)),
        completed: completedCount,
        total: totalCount,
      });
    }

    currentWeekStart = new Date(weekEnd);
  }

  return {weeklyBreakdown};
};

module.exports = getWeeklyGoalsBreakdownReport;

