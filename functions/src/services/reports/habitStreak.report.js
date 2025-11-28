const db = require("../../../db/models/index");
const {
  getGoalEntries,
  getPeriodBoundaries,
  getPreviousPeriodBoundaries,
} = require("../../../utils/goalHelpers");

/**
 * Calculates habit streak (longest consecutive completed periods) for a user
 * 
 * SQL/Sequelize Query Logic:
 * 
 * 1. SELECT goals WHERE user_id = ? AND club_id = ? AND type = 'habit' AND archived = false
 *    - Get all habit goals for the user
 * 
 * 2. For each habit goal:
 *    - Calculate period boundaries based on cadence (day/week/month/quarter)
 *    - Start from current period and iterate backwards
 *    - EXCLUDE incomplete current periods (periods where end > now)
 *    - Only include periods that are fully complete
 * 
 * 3. For each completed period:
 *    - SELECT goal_entry WHERE goal_id = ? AND user_id = ? 
 *      AND occurred_at >= period_start AND occurred_at < period_end
 *    - Check if entries meet target (count or quantity)
 *    - Mark period as completed or not
 * 
 * 4. Calculate streak:
 *    - Start from the most recent completed period
 *    - Count consecutive completed periods going backwards
 *    - Stop when a period is not completed
 *    - Return the longest streak across all habits
 * 
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date for the report (optional, for limiting search range)
 * @param {Date} endDate - End date for the report (optional, defaults to now)
 * @returns {Promise<Object>} Report data with longestStreak and habitStreaks
 */
const getHabitStreakReport = async (userId, clubId, startDate = null, endDate = null) => {
  const now = new Date();
  const effectiveEndDate = endDate || now;

  // SQL Query 1: Get all habit goals for this user in this club
  // SELECT * FROM goals 
  // WHERE user_id = ? AND club_id = ? AND type = 'habit' AND archived = false
  const goals = await db.Goal.findAll({
    where: {
      userId,
      clubId: parseInt(clubId),
      archived: false,
      type: 'habit',
    },
    order: [["created_at", "ASC"]],
  });

  const habitGoals = goals.map((g) => g.toJSON());

  if (habitGoals.length === 0) {
    return {
      longestStreak: 0,
      habitStreaks: [],
    };
  }

  // Calculate streak for each habit
  const habitStreaks = await Promise.all(
    habitGoals.map(async (goal) => {
      if (!goal.cadence) {
        return {
          goalId: goal.id,
          title: goal.title,
          streak: 0,
        };
      }

      const periods = [];
      let currentBoundaries = getPeriodBoundaries(goal.cadence);

      // Start from current period and go back until we're before startDate
      // CRITICAL: Exclude the current/incomplete period
      // Only include periods where end <= now (fully completed periods)
      let periodIndex = 0;
      while (currentBoundaries.start >= (startDate || new Date(0))) {
        // Only include periods that:
        // 1. Overlap with the date range
        // 2. Are fully complete (end <= now) - EXCLUDE in-progress periods
        if (
          currentBoundaries.end > (startDate || new Date(0)) &&
          currentBoundaries.start <= effectiveEndDate &&
          currentBoundaries.end <= now // EXCLUDE incomplete periods
        ) {
          // SQL Query 2: Get entries for this period
          // SELECT * FROM goal_entry 
          // WHERE goal_id = ? AND user_id = ? 
          // AND occurred_at >= ? AND occurred_at < ?
          // ORDER BY occurred_at DESC
          const entries = await getGoalEntries(
            userId,
            goal.id,
            currentBoundaries.start,
            currentBoundaries.end,
          );

          // Check if period is completed based on goal measure type
          const completed = goal.measure === "count" ?
            entries.length >= goal.targetCount :
            entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >=
              parseFloat(goal.targetQuantity);

          periods.push({
            period: periodIndex,
            start: currentBoundaries.start,
            end: currentBoundaries.end,
            completed,
          });
        }

        currentBoundaries = getPreviousPeriodBoundaries(goal.cadence, currentBoundaries.start);
        periodIndex++;

        // Safety limit to prevent infinite loops
        if (periodIndex > 100) break;
      }

      // Calculate streak (consecutive completed periods from most recent)
      // Periods are ordered from most recent to oldest
      let streak = 0;
      for (const period of periods) {
        if (period.completed) {
          streak++;
        } else {
          break; // Stop at first incomplete period
        }
      }

      return {
        goalId: goal.id,
        title: goal.title,
        streak,
      };
    }),
  );

  // Find the longest streak across all habits
  const longestStreak = habitStreaks.reduce((max, habit) => {
    return Math.max(max, habit.streak);
  }, 0);

  return {
    longestStreak,
    habitStreaks,
  };
};

module.exports = getHabitStreakReport;

