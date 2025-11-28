import { 
  getHabitConsistencyReport, 
  getWeeklyTrendReport,
  getHabitStreakReport,
  getGoalTypeDistributionReport 
} from '../reports/reports.service';

/**
 * Get personal goals report (combines multiple report endpoints)
 * This function maintains backward compatibility with the old endpoint
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Combined personal goals report data
 */
export const getPersonalGoalsReport = async (userId, clubId, startDate, endDate) => {
  // Fetch all report data in parallel
  const [habitConsistency, weeklyTrend, goalTypeDistribution] = await Promise.all([
    getHabitConsistencyReport(userId, clubId, startDate, endDate),
    getWeeklyTrendReport(userId, clubId, startDate, endDate),
    getGoalTypeDistributionReport(userId, clubId, false),
  ]);

  // Combine into the expected format
  return {
    habitConsistency: habitConsistency.habitConsistency,
    weeklyTrend: weeklyTrend.weeklyTrend,
    goalTypeDistribution: goalTypeDistribution.goalTypeDistribution,
  };
};

