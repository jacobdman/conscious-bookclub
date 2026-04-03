import { getLeaderboardReport } from '../reports/reports.service';
import { apiCall } from '../apiHelpers';

/**
 * Get club goals report (uses new reports API for leaderboard)
 * This function maintains backward compatibility with the old endpoint
 * @param {number} clubId - Club ID
 * @param {string} userId - User ID (for membership verification)
 * @param {Date} startDate - Start date (optional)
 * @param {Date} endDate - End date (optional)
 * @param {boolean} includeAnalytics - Include expensive analytics (still uses old endpoint)
 * @returns {Promise<Object>} Club goals report data
 */
export const getClubGoalsReport = async (clubId, userId, startDate, endDate, includeAnalytics = false) => {
  // Use new reports API for leaderboard
  const leaderboardData = await getLeaderboardReport(clubId, userId, startDate, endDate);

  // For analytics, still use old endpoint for now
  // TODO: Migrate analytics to new reports API
  let analyticsData = null;

  if (includeAnalytics) {
    const params = new URLSearchParams({ userId });
    if (startDate) {
      params.append('startDate', startDate.toISOString());
    }
    if (endDate) {
      params.append('endDate', endDate.toISOString());
    }
    params.append('includeAnalytics', 'true');
    const oldData = await apiCall(`/v1/clubs/${clubId}/goals-report?${params}`);
    analyticsData = oldData.averageCompletionByType || oldData.participationHeatmap || oldData.clubGoalTypeDistribution || oldData.bookCompletionPercentage ? oldData : null;
  }

  // Combine new leaderboard data with old analytics if needed
  return {
    ...leaderboardData,
    ...(analyticsData && {
      averageCompletionByType: analyticsData.averageCompletionByType,
      participationHeatmap: analyticsData.participationHeatmap,
      clubGoalTypeDistribution: analyticsData.clubGoalTypeDistribution,
      bookCompletionPercentage: analyticsData.bookCompletionPercentage,
      topPerformers: analyticsData.topPerformers,
    }),
  };
};
