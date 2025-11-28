import { apiCall } from '../apiHelpers';

/**
 * Get habit consistency report for a user
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Habit consistency report data
 */
export const getHabitConsistencyReport = async (userId, clubId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  return apiCall(`/v1/reports/habit-consistency?${params}`);
};

/**
 * Get weekly trend report for a user
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Weekly trend report data
 */
export const getWeeklyTrendReport = async (userId, clubId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  return apiCall(`/v1/reports/weekly-trend?${params}`);
};

/**
 * Get habit streak report for a user
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Habit streak report data
 */
export const getHabitStreakReport = async (userId, clubId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  return apiCall(`/v1/reports/habit-streak?${params}`);
};

/**
 * Get leaderboard report for a club
 * @param {number} clubId - Club ID
 * @param {string} userId - User ID (for membership verification)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Leaderboard report data
 */
export const getLeaderboardReport = async (clubId, userId, startDate, endDate) => {
  const params = new URLSearchParams({ clubId: clubId.toString(), userId });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  return apiCall(`/v1/reports/leaderboard?${params}`);
};

/**
 * Get goal type distribution report
 * @param {string} userId - User ID (optional if forClub is true)
 * @param {number} clubId - Club ID
 * @param {boolean} forClub - If true, get club-wide distribution; if false, get user distribution
 * @returns {Promise<Object>} Goal type distribution data
 */
export const getGoalTypeDistributionReport = async (userId, clubId, forClub = false) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  if (userId) {
    params.append('userId', userId);
  }
  if (forClub) {
    params.append('forClub', 'true');
  }
  return apiCall(`/v1/reports/goal-type-distribution?${params}`);
};

/**
 * Get weekly goals breakdown report
 * @param {string} userId - User ID
 * @param {number} clubId - Club ID
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @returns {Promise<Object>} Weekly goals breakdown data
 */
export const getWeeklyGoalsBreakdownReport = async (userId, clubId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  return apiCall(`/v1/reports/weekly-goals-breakdown?${params}`);
};

