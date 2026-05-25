const db = require("../../../db/models/index");
const {
  getGoalEntries,
  getPeriodBoundaries,
  getEffectiveClubTarget,
} = require("../../../utils/goalHelpers");

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
 * Aggregated progress for one club goal (all members).
 * @param {number|string} clubGoalId
 * @param {number|string} clubId
 * @param {string} userId - caller (membership check)
 * @param {string|null} timezone
 */
const getClubGoalProgressReport = async (clubGoalId, clubId, userId, timezone = null) => {
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
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["uid", "displayName", "photoUrl"],
      },
    ],
  });

  const totalMembers = memberGoals.length;
  let aggregate = {
    actual: 0,
    target: 0,
    percent: 0,
    completedMembers: 0,
    totalMembers,
    label: "",
  };

  if (clubGoal.type === "habit" && clubGoal.cadence) {
    const period = clubGoal.reportingPeriod || clubGoal.cadence;
    const boundaries = getPeriodBoundaries(period, null, timezone);
    let completed = 0;
    for (const g of memberGoals) {
      const entries = await getGoalEntries(g.userId, g.id, boundaries.start, boundaries.end);
      const ok =
        g.measure === "count" ?
          entries.length >= (g.targetCount || 0) :
          entries.reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0) >=
          parseFloat(g.targetQuantity || 0);
      if (ok) completed++;
    }
    aggregate = {
      actual: completed,
      target: totalMembers,
      percent: totalMembers > 0 ? (completed / totalMembers) * 100 : 0,
      completedMembers: completed,
      totalMembers,
      label: "members_completed_period",
    };
  } else if (clubGoal.type === "metric" && clubGoal.cadence) {
    const period = clubGoal.reportingPeriod || clubGoal.cadence;
    const boundaries = getPeriodBoundaries(period, null, timezone);
    let sumActual = 0;
    let completedMembers = 0;
    const isIndividualTarget = clubGoal.contributionMode === "individual_target";
    const underBudget =
      clubGoal.progressDirection === "stay_under" ||
      clubGoal.progressDirection === "decrease";
    for (const g of memberGoals) {
      const entries = await getGoalEntries(g.userId, g.id, boundaries.start, boundaries.end);
      const actual = entries.reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0);
      sumActual += actual;
      if (isIndividualTarget && !underBudget) {
        const memberTarget = parseFloat(g.targetQuantity) || 0;
        if (memberTarget > 0 && actual >= memberTarget) {
          completedMembers += 1;
        }
      }
    }

    const sharedOrIndividual =
      clubGoal.contributionMode === "shared_total" ||
      clubGoal.contributionMode === "individual_target";
    if (sharedOrIndividual) {
      const {effectiveTarget, storedTarget} = getEffectiveClubTarget(
          clubGoal,
          totalMembers,
          timezone,
      );
      const targetQty = effectiveTarget;
      aggregate = {
        actual: sumActual,
        target: targetQty,
        storedTarget,
        percent: targetQty > 0 ? Math.min(100, (sumActual / targetQty) * 100) : 0,
        completedMembers,
        totalMembers,
        label: "sum_quantity",
      };
      if (underBudget) {
        const rem =
          targetQty > 0 ? Math.min(100, ((targetQty - sumActual) / targetQty) * 100) : 0;
        aggregate.percent = rem;
        aggregate.label = "remaining_budget";
        aggregate.completedMembers = 0;
      }
    }
  } else if (clubGoal.type === "one_time") {
    let done = 0;
    for (const g of memberGoals) {
      if (g.completed) done++;
    }
    aggregate = {
      actual: done,
      target: totalMembers,
      percent: totalMembers > 0 ? (done / totalMembers) * 100 : 0,
      completedMembers: done,
      totalMembers,
      label: "members_completed",
    };
  } else if (clubGoal.type === "milestone") {
    let totalM = 0;
    let doneM = 0;
    for (const g of memberGoals) {
      const milestones = await db.Milestone.findAll({where: {goalId: g.id}});
      totalM += milestones.length;
      doneM += milestones.filter((m) => m.done).length;
    }
    aggregate = {
      actual: doneM,
      target: totalM,
      percent: totalM > 0 ? (doneM / totalM) * 100 : 0,
      completedMembers: 0,
      totalMembers,
      label: "milestones_done",
    };
  }

  return {
    clubGoal,
    aggregate,
  };
};

module.exports = getClubGoalProgressReport;
