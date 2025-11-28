const db = require("../../../db/models/index");
const {
  getGoalEntries,
  getPeriodBoundaries,
  getPreviousPeriodBoundaries,
  calculateHabitWeight,
} = require("../../../utils/goalHelpers");

/**
 * Calculates habit consistency for a user over a date range
 * 
 * SQL/Sequelize Query Logic:
 * 
 * 1. SELECT goals WHERE user_id = ? AND club_id = ? AND type = 'habit' AND archived = false
 *    - Includes milestones for milestone-related goals
 *    - Orders by created_at ASC
 * 
 * 2. For each habit goal:
 *    - Calculate period boundaries based on cadence (day/week/month/quarter)
 *    - Start from current period and iterate backwards
 *    - EXCLUDE incomplete current periods (periods where end > now)
 *    - Only include periods that are fully within the date range AND completed
 * 
 * 3. For each completed period:
 *    - SELECT goal_entry WHERE goal_id = ? AND user_id = ? 
 *      AND occurred_at >= period_start AND occurred_at < period_end
 *    - Check if entries meet target (count or quantity)
 *    - Mark period as completed or not
 * 
 * 4. Calculate consistency rate per habit:
 *    - consistencyRate = (completed_periods / total_completed_periods) * 100
 *    - Only counts periods that are fully complete (excludes in-progress)
 * 
 * 5. Sort habits by consistency rate (descending), then by creation date (oldest first)
 * 
 * 6. Apply weighted averaging:
 *    - weight_n = 1 / log2(n + 1) where n is position (1, 2, 3...)
 *    - weightedAverage = SUM(consistencyRate * weight) / SUM(weight)
 * 
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date for the report (optional, defaults to current quarter start)
 * @param {Date} endDate - End date for the report (optional, defaults to current quarter end)
 * @returns {Promise<Object>} Report data with weightedAverage and habitDetails
 */
const getHabitConsistencyReport = async (userId, clubId, startDate = null, endDate = null) => {
  // Default to current quarter if no date range provided
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const defaultStartDate = new Date(now.getFullYear(), quarter * 3, 1);
  const defaultEndDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
  defaultEndDate.setHours(23, 59, 59, 999);

  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate || defaultEndDate;

  // SQL Query 1: Get all habit goals for this user in this club
  // SELECT * FROM goals 
  // WHERE user_id = ? AND club_id = ? AND type = 'habit' AND archived = false
  // ORDER BY created_at ASC
  const goals = await db.Goal.findAll({
    where: {
      userId,
      clubId: parseInt(clubId),
      archived: false,
      type: 'habit',
    },
    include: [
      {
        model: db.Milestone,
        as: "milestones",
        attributes: ["id", "title", "done", "doneAt"],
      },
    ],
    order: [["created_at", "ASC"]],
  });

  const habitGoals = goals.map((g) => g.toJSON());

  // Calculate consistency rate for each habit
  // For each goal, we'll calculate periods and exclude incomplete ones
  const habitsWithConsistency = await Promise.all(
    habitGoals.map(async (goal) => {
      if (!goal.cadence) {
        return {
          goal,
          consistencyRate: 0,
          consistency: null,
        };
      }

      const periods = [];
      let currentBoundaries = getPeriodBoundaries(goal.cadence);
      const now = new Date();

      // Start from current period and go back until we're before startDate
      // CRITICAL: Exclude the current/incomplete period
      // Only include periods where end <= now (fully completed periods)
      let periodIndex = 0;
      while (currentBoundaries.start >= (effectiveStartDate || new Date(0))) {
        // Only include periods that:
        // 1. Overlap with the date range
        // 2. Are fully complete (end <= now) - EXCLUDE in-progress periods
        if (
          currentBoundaries.end > (effectiveStartDate || new Date(0)) &&
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

      // Calculate consistency rate (only from completed periods)
      let consistencyRate = 0;
      if (periods.length > 0) {
        const completedCount = periods.filter((p) => p.completed).length;
        consistencyRate = (completedCount / periods.length) * 100;
      }

      return {
        goal,
        consistencyRate,
        consistency: {
          consistencyRate,
          periods,
        },
      };
    }),
  );

  // Sort by consistency rate (descending), then by creation date (oldest first) for tie-breaking
  habitsWithConsistency.sort((a, b) => {
    if (b.consistencyRate !== a.consistencyRate) {
      return b.consistencyRate - a.consistencyRate;
    }
    const dateA = new Date(a.goal.created_at || a.goal.createdAt || 0);
    const dateB = new Date(b.goal.created_at || b.goal.createdAt || 0);
    return dateA - dateB;
  });

  // Calculate weighted habit consistency
  // Assign habit-specific positions (1, 2, 3...) based on sorted order
  let weightedSum = 0;
  let totalWeight = 0;
  const habitDetails = [];

  for (let i = 0; i < habitsWithConsistency.length; i++) {
    const {goal, consistencyRate, consistency} = habitsWithConsistency[i];
    const habitPosition = i + 1; // Position among habits only (1, 2, 3...)
    const weight = calculateHabitWeight(habitPosition);

    if (consistency) {
      weightedSum += consistencyRate * weight;
      totalWeight += weight;
      habitDetails.push({
        goalId: goal.id,
        title: goal.title,
        habitPosition,
        weight,
        consistencyRate,
      });
    }
  }

  const weightedHabitConsistency = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    habitConsistency: {
      weightedAverage: weightedHabitConsistency,
      habitDetails,
    },
  };
};

module.exports = getHabitConsistencyReport;

