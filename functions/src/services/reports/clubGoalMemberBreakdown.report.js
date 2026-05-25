const db = require("../../../db/models/index");
const {
  getGoalEntries,
  getPeriodBoundaries,
  getEffectiveClubTarget,
  shouldScaleClubGoalTarget,
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
 * Per-member rows for one club goal.
 * @param {number|string} clubGoalId Club goal id.
 * @param {number|string} clubId Club id.
 * @param {string} userId Caller user id.
 * @param {string|null} timezone Optional IANA timezone.
 */
const getClubGoalMemberBreakdownReport = async (clubGoalId, clubId, userId, timezone = null) => {
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

  const members = [];
  const totalMembers = memberGoals.length;
  const isMetricWithCadence = clubGoal.type === "metric" && clubGoal.cadence;
  const underBudgetMetric =
    isMetricWithCadence &&
    (clubGoal.progressDirection === "stay_under" ||
      clubGoal.progressDirection === "decrease");
  const metricTargets = isMetricWithCadence ?
    getEffectiveClubTarget(clubGoal, totalMembers, timezone) :
    {effectiveTarget: 0, multiplier: 1, storedTarget: 0};
  const {effectiveTarget, multiplier} = metricTargets;
  const fairSharePeriod =
    underBudgetMetric && totalMembers > 0 ? effectiveTarget / totalMembers : 0;
  const storedPerCadence = parseFloat(clubGoal.targetQuantity) || 0;
  const fairShareToday = storedPerCadence;

  let todayMembersLogged = 0;
  let todayMaxMember = null;

  for (const g of memberGoals) {
    const gj = g.toJSON();
    const row = {
      userId: gj.userId,
      user: gj.user,
      goalId: gj.id,
      completed: !!gj.completed,
      actual: 0,
      target: 0,
      percent: 0,
      periodCompleted: false,
      milestonesCompleted: 0,
      milestonesTotal: 0,
    };

    if (clubGoal.type === "habit" && clubGoal.cadence) {
      const period = clubGoal.reportingPeriod || clubGoal.cadence;
      const boundaries = getPeriodBoundaries(period, null, timezone);
      const entries = await getGoalEntries(gj.userId, gj.id, boundaries.start, boundaries.end);
      const actual = gj.measure === "count" ?
        entries.length :
        entries.reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0);
      const target = gj.measure === "count" ? gj.targetCount : parseFloat(gj.targetQuantity) || 0;
      row.actual = actual;
      row.target = target;
      row.periodCompleted = target > 0 ? actual >= target : false;
      row.percent = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
    } else if (clubGoal.type === "metric" && clubGoal.cadence) {
      const period = clubGoal.reportingPeriod || clubGoal.cadence;
      const boundaries = getPeriodBoundaries(period, null, timezone);
      const entries = await getGoalEntries(gj.userId, gj.id, boundaries.start, boundaries.end);
      const actual = entries.reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0);
      let target = parseFloat(gj.targetQuantity) || 0;
      if (clubGoal.contributionMode === "individual_target") {
        target = shouldScaleClubGoalTarget(clubGoal) ?
          storedPerCadence * multiplier :
          storedPerCadence;
      }
      row.actual = actual;
      row.target = target;
      row.periodCompleted = target > 0 && actual >= target;
      row.percent = target > 0 ? Math.min(100, (actual / target) * 100) : 0;
      if (underBudgetMetric) {
        row.percent = target > 0 ? Math.min(100, ((target - actual) / target) * 100) : 0;
      }

      const todayBounds = getPeriodBoundaries("day", null, timezone);
      const todayEntries = await getGoalEntries(
          gj.userId,
          gj.id,
          todayBounds.start,
          todayBounds.end,
      );
      const todayActual = todayEntries.reduce(
          (s, e) => s + (parseFloat(e.quantity) || 0),
          0,
      );
      row.todayActual = todayActual;
      if (todayActual > 0) {
        todayMembersLogged += 1;
        if (!todayMaxMember || todayActual > todayMaxMember.actual) {
          todayMaxMember = {
            userId: row.userId,
            user: row.user,
            actual: todayActual,
          };
        }
      }
    } else if (clubGoal.type === "one_time") {
      row.actual = gj.completed ? 1 : 0;
      row.target = 1;
      row.percent = gj.completed ? 100 : 0;
      row.periodCompleted = !!gj.completed;
    } else if (clubGoal.type === "milestone") {
      const milestones = await db.Milestone.findAll({where: {goalId: gj.id}});
      const total = milestones.length;
      const done = milestones.filter((m) => m.done).length;
      row.milestonesCompleted = done;
      row.milestonesTotal = total;
      row.actual = done;
      row.target = total;
      row.percent = total > 0 ? (done / total) * 100 : 0;
    }

    members.push(row);
  }

  return {
    clubGoal,
    members,
    todayMembersLogged: underBudgetMetric ? todayMembersLogged : 0,
    todayMaxMember: underBudgetMetric ? todayMaxMember : null,
    fairSharePeriod: underBudgetMetric ? fairSharePeriod : 0,
    fairShareToday: underBudgetMetric ? fairShareToday : 0,
    effectiveTarget: isMetricWithCadence ? effectiveTarget : 0,
    storedTarget: isMetricWithCadence ? parseFloat(clubGoal.targetQuantity) || 0 : 0,
  };
};

module.exports = getClubGoalMemberBreakdownReport;
