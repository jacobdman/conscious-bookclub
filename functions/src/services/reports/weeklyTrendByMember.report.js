const db = require("../../../db/models/index");
const {
  getPeriodBoundaries,
  getPreviousPeriodBoundaries,
  calculateHabitWeight,
  getGoalStartDate,
  getImplicitSuccessCount,
  isPeriodPaused,
} = require("../../../utils/goalHelpers");
const {Op} = db;

const normalizePausePeriodsFromGoal = (goal) => {
  const raw = goal.goalPauses || [];
  return raw.map((p) => ({
    pausedAt: p.pausedAt || p.paused_at,
    resumedAt: p.resumedAt ?? p.resumed_at ?? null,
  }));
};

/**
 * Same scoring as calculateHabitConsistency but uses pre-fetched entries (no DB).
 * @param {Object} goal Habit goal row
 * @param {Date} startDate Range start (e.g. week start)
 * @param {Date} endDate Range end (e.g. week end)
 * @param {Array} entries Entries for this goal (occurredAt in range)
 * @param {string|null} timezone null = UTC (matches legacy club goals-report weekly trend)
 * @return {{consistencyRate: number}|null}
 */
const habitConsistencyFromEntries = (goal, startDate, endDate, entries, timezone = null) => {
  if (goal.type !== "habit" || !goal.cadence) {
    return null;
  }

  const periods = [];
  let currentBoundaries = getPeriodBoundaries(goal.cadence, null, timezone);

  const effectiveEndDate = endDate && endDate < new Date() ? endDate : new Date();
  const goalStartDate = getGoalStartDate(goal, startDate);
  const implicitSuccessCount = getImplicitSuccessCount(
      goal.cadence,
      startDate || new Date(0),
      goalStartDate,
      effectiveEndDate,
      timezone,
      new Date(),
  );

  const pausePeriodsList = normalizePausePeriodsFromGoal(goal);
  const nowForPause = new Date();

  let periodIndex = 0;
  while (currentBoundaries.start >= goalStartDate) {
    if (currentBoundaries.end > goalStartDate &&
        currentBoundaries.start <= effectiveEndDate) {
      if (!isPeriodPaused(
          currentBoundaries.start,
          currentBoundaries.end,
          pausePeriodsList,
          nowForPause,
      )) {
        const periodStart = currentBoundaries.start;
        const periodEnd = currentBoundaries.end;
        const periodEntries = entries.filter((entry) => {
          const occurredAt = new Date(entry.occurredAt || entry.occurred_at);
          return occurredAt >= periodStart && occurredAt < periodEnd;
        });

        const completed = goal.measure === "count" ?
          periodEntries.length >= goal.targetCount :
          periodEntries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >=
            parseFloat(goal.targetQuantity);

        periods.push({
          period: periodIndex,
          start: currentBoundaries.start,
          end: currentBoundaries.end,
          completed,
        });
      }
    }

    currentBoundaries = getPreviousPeriodBoundaries(
        goal.cadence,
        currentBoundaries.start,
        timezone,
    );
    periodIndex++;

    if (periodIndex > 100) break;
  }

  if (periods.length === 0 && implicitSuccessCount === 0) {
    return {consistencyRate: 0};
  }

  const completedCount = periods.filter((p) => p.completed).length + implicitSuccessCount;
  const totalPeriods = periods.length + implicitSuccessCount;
  const consistencyRate = totalPeriods > 0 ? (completedCount / totalPeriods) * 100 : 0;

  return {consistencyRate};
};

/**
 * Weekly completion trend per member (batched DB reads).
 * Matches legacy GET /v1/clubs/:clubId/goals-report?includeWeeklyTrend=true shape.
 *
 * @param {number} clubId
 * @param {string} userId Requesting user (membership check)
 * @param {Date|null} startDate
 * @param {Date|null} endDate
 * @return {Promise<Array<{weekStart: string, weekEnd: string, members: Array}>|[]>}
 */
const getWeeklyTrendByMemberReport = async (
    clubId,
    userId,
    startDate = null,
    endDate = null,
) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId: parseInt(clubId), userId},
  });
  if (!membership) {
    const error = new Error("Club not found or user is not a member");
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const defaultStartDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() - 56);
    return date;
  })();
  const effectiveStartDate = startDate || defaultStartDate;
  const effectiveEndDate = endDate && endDate < now ? endDate : now;

  const members = await db.ClubMember.findAll({
    where: {clubId: parseInt(clubId)},
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["uid", "email", "displayName", "photoUrl"],
      },
    ],
  });

  if (members.length === 0) {
    return [];
  }

  const memberUserIds = members.map((m) => m.userId);

  const allHabitGoals = await db.Goal.findAll({
    where: {
      clubId: parseInt(clubId),
      userId: {[Op.in]: memberUserIds},
      archived: false,
      type: "habit",
    },
    include: [
      {
        model: db.GoalPause,
        as: "goalPauses",
        attributes: ["id", "pausedAt", "resumedAt"],
        separate: true,
        order: [["paused_at", "ASC"]],
      },
    ],
    order: [["created_at", "ASC"]],
  });

  const goalsByUser = new Map();
  for (const g of allHabitGoals) {
    const uid = g.userId;
    if (!goalsByUser.has(uid)) {
      goalsByUser.set(uid, []);
    }
    goalsByUser.get(uid).push(g.toJSON());
  }

  const goalIds = allHabitGoals.map((g) => g.id);
  if (goalIds.length === 0) {
    // Still return week rows with 0% for every member (legacy pushed members each week)
    const weeklyTrendEmptyGoals = [];
    let currentWeekStart = new Date(effectiveStartDate);
    const dayOfWeek = currentWeekStart.getUTCDay();
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysToMonday);
    currentWeekStart.setUTCHours(0, 0, 0, 0);

    while (currentWeekStart <= effectiveEndDate) {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
      weeklyTrendEmptyGoals.push({
        weekStart: currentWeekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        members: members.map((member) => ({
          userId: member.userId,
          completionRate: 0,
          user: {
            uid: member.user.uid,
            displayName: member.user.displayName,
            photoUrl: member.user.photoUrl,
          },
        })),
      });
      currentWeekStart = new Date(weekEnd);
    }
    return weeklyTrendEmptyGoals;
  }

  const overlapBufferMs = 120 * 24 * 60 * 60 * 1000;
  const entryLower = new Date(effectiveStartDate.getTime() - overlapBufferMs);
  const entryUpper = new Date(Math.max(now.getTime(), effectiveEndDate.getTime()));

  const allEntries = await db.GoalEntry.findAll({
    where: {
      goalId: {[Op.in]: goalIds},
      userId: {[Op.in]: memberUserIds},
      occurredAt: {
        [Op.gte]: entryLower,
        [Op.lt]: entryUpper,
      },
    },
    order: [["occurred_at", "ASC"]],
  });

  const entriesKey = (uid, goalId) => `${uid}::${goalId}`;
  const entriesByUserGoal = new Map();
  for (const row of allEntries) {
    const key = entriesKey(row.userId, row.goalId);
    if (!entriesByUserGoal.has(key)) {
      entriesByUserGoal.set(key, []);
    }
    entriesByUserGoal.get(key).push({id: row.id, ...row.toJSON()});
  }

  const timezone = null;
  const weeklyTrendByMember = [];

  let currentWeekStart = new Date(effectiveStartDate);
  const dayOfWeek = currentWeekStart.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysToMonday);
  currentWeekStart.setUTCHours(0, 0, 0, 0);

  while (currentWeekStart <= effectiveEndDate) {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const weekData = {
      weekStart: currentWeekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      members: [],
    };

    const weekStart = new Date(currentWeekStart);
    const weekEndForCalc = new Date(weekEnd);

    for (const member of members) {
      const memberUserId = member.userId;
      const habitGoals = goalsByUser.get(memberUserId) || [];

      if (habitGoals.length === 0) {
        weekData.members.push({
          userId: memberUserId,
          completionRate: 0,
          user: {
            uid: member.user.uid,
            displayName: member.user.displayName,
            photoUrl: member.user.photoUrl,
          },
        });
        continue;
      }

      const habitsWithConsistency = habitGoals.map((goal) => {
        const key = entriesKey(memberUserId, goal.id);
        const entries = entriesByUserGoal.get(key) || [];
        const consistency = habitConsistencyFromEntries(
            goal,
            weekStart,
            weekEndForCalc,
            entries,
            timezone,
        );
        return {
          goal,
          consistencyRate: consistency ? consistency.consistencyRate : 0,
        };
      });

      habitsWithConsistency.sort((a, b) => {
        if (b.consistencyRate !== a.consistencyRate) {
          return b.consistencyRate - a.consistencyRate;
        }
        const dateA = new Date(a.goal.created_at || a.goal.createdAt || 0);
        const dateB = new Date(b.goal.created_at || b.goal.createdAt || 0);
        return dateA - dateB;
      });

      let weightedSum = 0;
      let totalWeight = 0;
      for (let i = 0; i < habitsWithConsistency.length; i++) {
        const {consistencyRate} = habitsWithConsistency[i];
        const habitPosition = i + 1;
        const weight = calculateHabitWeight(habitPosition);
        weightedSum += consistencyRate * weight;
        totalWeight += weight;
      }

      const completionRate = totalWeight > 0 ? weightedSum / totalWeight : 0;

      weekData.members.push({
        userId: memberUserId,
        completionRate,
        user: {
          uid: member.user.uid,
          displayName: member.user.displayName,
          photoUrl: member.user.photoUrl,
        },
      });
    }

    weeklyTrendByMember.push(weekData);
    currentWeekStart = new Date(weekEnd);
  }

  return weeklyTrendByMember;
};

module.exports = getWeeklyTrendByMemberReport;
