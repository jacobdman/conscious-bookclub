const db = require("../../../db/models/index");

/**
 * Calculates goal type distribution for a user or club
 *
 * SQL/Sequelize Query Logic:
 *
 * 1. SELECT goals WHERE user_id = ? AND club_id = ? AND archived = false
 *    - Count goals by type (habit, metric, milestone, one_time)
 *    - Only count non-completed goals
 *
 * @param {string} userId - User ID (optional, for personal report)
 * @param {number} clubId - Club ID
 * @param {boolean} forClub - If true, count all club goals; if false, count user goals
 * @return {Promise<Object>} Goal type distribution counts
 */
const getGoalTypeDistributionReport = async (userId, clubId, forClub = false) => {
  const whereClause = {
    clubId: parseInt(clubId),
    archived: false,
    completed: false,
  };

  if (!forClub && userId) {
    whereClause.userId = userId;
  }

  // SQL Query: Get all non-completed, non-archived goals
  // SELECT type, COUNT(*) FROM goals
  // WHERE club_id = ? AND archived = false AND completed = false
  // [AND user_id = ?] -- if personal report
  // GROUP BY type
  const goals = await db.Goal.findAll({
    where: whereClause,
    attributes: ["type"],
  });

  const distribution = {
    habit: 0,
    metric: 0,
    milestone: 0,
    oneTime: 0,
  };

  goals.forEach((goal) => {
    const type = goal.type;
    if (type === "habit") {
      distribution.habit++;
    } else if (type === "metric") {
      distribution.metric++;
    } else if (type === "milestone") {
      distribution.milestone++;
    } else if (type === "one_time") {
      distribution.oneTime++;
    }
  });

  return distribution;
};

module.exports = getGoalTypeDistributionReport;

