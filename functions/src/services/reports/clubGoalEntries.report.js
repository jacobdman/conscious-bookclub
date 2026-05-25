const db = require("../../../db/models/index");
const {getPeriodBoundaries} = require("../../../utils/goalHelpers");

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

const DEFAULT_LIMIT = 20;

/**
 * Paginated goal entries for all members of a club goal (reporting period).
 * @param {number|string} clubGoalId
 * @param {number|string} clubId
 * @param {string} userId
 * @param {string|null} timezone
 * @param {number} limit
 * @param {number} offset
 */
const getClubGoalEntriesReport = async (
    clubGoalId,
    clubId,
    userId,
    timezone = null,
    limit = DEFAULT_LIMIT,
    offset = 0,
) => {
  await verifyMembership(clubId, userId);

  const cg = await db.ClubGoal.findOne({
    where: {
      id: parseInt(clubGoalId, 10),
      clubId: parseInt(clubId, 10),
      archived: false,
    },
  });
  if (!cg) {
    const err = new Error("Club goal not found");
    err.status = 404;
    throw err;
  }

  const clubGoal = cg.toJSON();
  const memberGoals = await db.Goal.findAll({
    where: {clubGoalId: cg.id, archived: false},
    attributes: ["id", "userId"],
  });

  const goalIds = memberGoals.map((g) => g.id);
  if (goalIds.length === 0) {
    return {
      clubGoal,
      entries: [],
      hasMore: false,
      offset: 0,
      limit,
    };
  }

  const period = clubGoal.reportingPeriod || clubGoal.cadence;
  const boundaries = period ?
    getPeriodBoundaries(period, null, timezone) :
    {start: null, end: null};

  const whereClause = {
    goalId: {[db.Op.in]: goalIds},
  };
  if (boundaries.start && boundaries.end) {
    whereClause.occurredAt = {
      [db.Op.gte]: boundaries.start,
      [db.Op.lt]: boundaries.end,
    };
  }

  const limitNum = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1), 100);
  const offsetNum = Math.max(parseInt(offset, 10) || 0, 0);

  const {rows, count} = await db.GoalEntry.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["uid", "displayName", "photoUrl"],
      },
    ],
    order: [["occurred_at", "DESC"]],
    limit: limitNum + 1,
    offset: offsetNum,
  });

  const hasMore = rows.length > limitNum;
  const pageRows = hasMore ? rows.slice(0, limitNum) : rows;

  const entries = pageRows.map((entry) => {
    const ej = entry.toJSON();
    return {
      id: ej.id,
      goalId: ej.goalId,
      userId: ej.userId,
      occurredAt: ej.occurredAt,
      occurred_at: ej.occurredAt,
      quantity: ej.quantity,
      user: ej.user,
    };
  });

  return {
    clubGoal,
    entries,
    hasMore,
    offset: offsetNum,
    limit: limitNum,
    total: count,
  };
};

module.exports = getClubGoalEntriesReport;
