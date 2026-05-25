const db = require("../../../db/models/index");

/**
 * Create a personal Goal row for one member from a ClubGoal template.
 * @param {object} clubGoal ClubGoal row (Sequelize model or plain object).
 * @param {string} memberUserId Member uid.
 * @return {Promise<object>} Created Goal model instance.
 */
const createMemberGoalFromClubGoal = async (clubGoal, memberUserId) => {
  const cg = clubGoal.toJSON ? clubGoal.toJSON() : clubGoal;
  const payload = {
    userId: memberUserId,
    clubId: cg.clubId,
    clubGoalId: cg.id,
    title: cg.title,
    type: cg.type,
    measure: cg.measure,
    cadence: cg.cadence,
    targetCount: cg.targetCount,
    targetQuantity: cg.targetQuantity,
    unit: cg.unit,
    dueAt: cg.dueAt,
    progressDirection: cg.progressDirection || "increase",
    archived: false,
    completed: false,
    completedAt: null,
    visibility: "public",
  };

  const goal = await db.Goal.create(payload);

  if (cg.type === "milestone" && cg.milestoneTemplate && Array.isArray(cg.milestoneTemplate)) {
    for (const [i, m] of cg.milestoneTemplate.entries()) {
      await db.Milestone.create({
        goalId: goal.id,
        title: m.title,
        done: false,
        order: m.order !== undefined ? m.order : i,
      });
    }
  }

  return goal;
};

/**
 * When a user joins a club, create Goal rows for each active ClubGoal they do not yet have.
 * @param {number|string} clubId
 * @param {string} newUserId
 */
const syncClubGoalsForNewMember = async (clubId, newUserId) => {
  const clubGoals = await db.ClubGoal.findAll({
    where: {clubId: parseInt(clubId, 10), archived: false},
  });

  for (const cg of clubGoals) {
    const existing = await db.Goal.findOne({
      where: {clubGoalId: cg.id, userId: newUserId},
      paranoid: false,
    });
    if (!existing) {
      await createMemberGoalFromClubGoal(cg, newUserId);
      continue;
    }
    if (existing.deletedAt) {
      await existing.restore();
      await existing.update({archived: false});
    } else if (existing.archived) {
      await existing.update({archived: false});
    }
  }
};

/**
 * Archive all member goals linked to a club goal (when the club goal is deleted).
 * @param {number|string} clubGoalId
 * @param {number|string} clubId
 */
const archiveGoalsForClubGoal = async (clubGoalId, clubId) => {
  await db.Goal.destroy({
    where: {
      clubGoalId: parseInt(clubGoalId, 10),
      clubId: parseInt(clubId, 10),
    },
  });
};

/**
 * Archive all club-linked goals for a member when they leave the club.
 * @param {number|string} clubId
 * @param {string} memberUserId
 */
const archiveMemberClubGoals = async (clubId, memberUserId) => {
  await db.Goal.destroy({
    where: {
      clubId: parseInt(clubId, 10),
      userId: memberUserId,
      clubGoalId: {[db.Op.ne]: null},
    },
  });
};

module.exports = {
  createMemberGoalFromClubGoal,
  syncClubGoalsForNewMember,
  archiveGoalsForClubGoal,
  archiveMemberClubGoals,
};
