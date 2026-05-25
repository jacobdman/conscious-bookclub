const db = require("../../../db/models/index");
const getClubGoalProgressReport = require("./clubGoalProgress.report");

const verifyMembership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId: parseInt(clubId, 10), userId},
  });
  if (!membership) {
    const err = new Error("Club not found or user is not a member");
    err.status = 404;
    throw err;
  }
  return membership;
};

/**
 * Summary row per active club goal for list + spotlight (calls progress per goal).
 * @param {number|string} clubId Club id
 * @param {string} userId Caller user id (membership check)
 * @param {string|null} timezone Optional IANA timezone
 * @return {Promise<{clubGoals: Array<object>}>}
 */
const getClubGoalOverviewReport = async (clubId, userId, timezone = null) => {
  await verifyMembership(clubId, userId);

  const clubGoals = await db.ClubGoal.findAll({
    where: {clubId: parseInt(clubId, 10), archived: false},
    order: [["created_at", "DESC"]],
  });

  const items = [];
  for (const cg of clubGoals) {
    const memberCount = await db.Goal.count({
      where: {clubGoalId: cg.id, archived: false},
    });

    let snapshot = null;
    try {
      const progress = await getClubGoalProgressReport(cg.id, clubId, userId, timezone);
      snapshot = progress.aggregate;
    } catch (e) {
      snapshot = {percent: 0, totalMembers: memberCount};
    }

    items.push({
      ...cg.toJSON(),
      memberGoalCount: memberCount,
      snapshot,
    });
  }

  return {clubGoals: items};
};

module.exports = getClubGoalOverviewReport;
