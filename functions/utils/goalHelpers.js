const db = require("../db/models/index");
const moment = require("moment-timezone");

// Helper function to get goal entries
const getGoalEntries = async (userId, goalId, periodStart, periodEnd) => {
  const whereClause = {
    goalId,
    userId,
  };

  if (periodStart && periodEnd) {
    whereClause.occurredAt = {
      [db.Op.gte]: periodStart,
      [db.Op.lt]: periodEnd,
    };
  }

  const entries = await db.GoalEntry.findAll({
    where: whereClause,
    order: [["occurred_at", "DESC"]],
  });
  return entries.map((entry) => ({id: entry.id, ...entry.toJSON()}));
};

// Helper function to get period boundaries
const getPeriodBoundaries = (cadence, timestamp = null, timezone = null) => {
  const base = timestamp ? moment(timestamp) : moment();
  const zonedNow = timezone ? base.tz(timezone) : base.utc();

  let start;
  let end;

  switch (cadence) {
    case "day": {
      start = zonedNow.clone().startOf("day");
      end = start.clone().add(1, "day");
      break;
    }
    case "week": {
      start = zonedNow.clone().startOf("week");
      end = start.clone().add(1, "week");
      break;
    }
    case "month": {
      start = zonedNow.clone().startOf("month");
      end = start.clone().add(1, "month");
      break;
    }
    case "quarter": {
      start = zonedNow.clone().startOf("quarter");
      end = start.clone().add(1, "quarter");
      break;
    }
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }

  return {start: start.toDate(), end: end.toDate()};
};

// Helper to get previous period boundaries
const getPreviousPeriodBoundaries = (cadence, currentStart, timezone = null) => {
  const base = timezone ? moment.tz(currentStart, timezone) : moment(currentStart).utc();

  let start;
  let end;

  switch (cadence) {
    case "day":
      start = base.clone().subtract(1, "day");
      end = start.clone().add(1, "day");
      break;
    case "week":
      start = base.clone().subtract(1, "week");
      end = start.clone().add(1, "week");
      break;
    case "month":
      start = base.clone().subtract(1, "month");
      end = start.clone().add(1, "month");
      break;
    case "quarter":
      start = base.clone().subtract(1, "quarter");
      end = start.clone().add(1, "quarter");
      break;
    default:
      start = base.clone();
      end = base.clone();
      break;
  }

  return {start: start.toDate(), end: end.toDate()};
};

// Calculate habit weight based on position among habits only
const calculateHabitWeight = (habitPosition) => {
  // weight_n = 1 / log2(n + 1)
  return 1 / Math.log2(habitPosition + 1);
};

// Clamp report start date to goal creation date
const getGoalStartDate = (goal, reportStartDate = null) => {
  const createdAtRaw = goal?.created_at || goal?.createdAt || null;
  const createdAt = createdAtRaw ? new Date(createdAtRaw) : null;
  const hasValidCreatedAt = createdAt instanceof Date && !Number.isNaN(createdAt.valueOf());

  if (reportStartDate && hasValidCreatedAt) {
    return reportStartDate > createdAt ? reportStartDate : createdAt;
  }

  if (reportStartDate) {
    return reportStartDate;
  }

  if (hasValidCreatedAt) {
    return createdAt;
  }

  return new Date(0);
};

// Count fully completed periods before a goal's creation within the report window
const getImplicitSuccessCount = (
    cadence,
    reportStartDate,
    goalStartDate,
    effectiveEndDate,
    timezone = null,
    now = new Date(),
) => {
  if (!cadence || !reportStartDate || !goalStartDate) {
    return 0;
  }

  const cutoffEnd = [goalStartDate, effectiveEndDate, now]
      .filter(Boolean)
      .reduce((min, date) => (date < min ? date : min));

  if (cutoffEnd <= reportStartDate) {
    return 0;
  }

  let currentBoundaries = getPeriodBoundaries(cadence, goalStartDate, timezone);
  currentBoundaries = getPreviousPeriodBoundaries(
      cadence,
      currentBoundaries.start,
      timezone,
  );

  let implicitCount = 0;
  let safety = 0;
  while (currentBoundaries.end > reportStartDate) {
    if (
      currentBoundaries.end <= cutoffEnd &&
      currentBoundaries.end > reportStartDate &&
      currentBoundaries.start < goalStartDate
    ) {
      implicitCount++;
    }

    currentBoundaries = getPreviousPeriodBoundaries(
        cadence,
        currentBoundaries.start,
        timezone,
    );

    safety++;
    if (safety > 200) break;
  }

  return implicitCount;
};

/**
 * True when a cadence period is fully covered by a pause (not scored).
 * Open pauses use `now` as the effective end of the pause range.
 * @param {Date} periodStart Period start.
 * @param {Date} periodEnd Period end.
 * @param {Array<Object>} pausePeriods Rows with pausedAt/paused_at and optional resumedAt.
 * @param {Date} [now] Reference time for open pauses.
 * @return {boolean} Whether the full period is inside a pause.
 */
const isPeriodPaused = (periodStart, periodEnd, pausePeriods, now = new Date()) => {
  if (!pausePeriods || pausePeriods.length === 0) return false;
  const ps = new Date(periodStart).getTime();
  const pe = new Date(periodEnd).getTime();
  return pausePeriods.some((p) => {
    const pauseStart = new Date(p.pausedAt || p.paused_at).getTime();
    const rawEnd = p.resumedAt ?? p.resumed_at;
    const pauseEnd = rawEnd ? new Date(rawEnd).getTime() : now.getTime();
    return pauseStart <= ps && pauseEnd >= pe;
  });
};

const normalizePausePeriodsFromGoal = (goal, pausePeriodsOverride) => {
  const raw = Array.isArray(pausePeriodsOverride) ?
    pausePeriodsOverride :
    (goal.goalPauses || []);
  return raw.map((p) => ({
    pausedAt: p.pausedAt || p.paused_at,
    resumedAt: p.resumedAt ?? p.resumed_at ?? null,
  }));
};

// Calculate consistency score for a habit goal over date range
// includeStreak: if true, calculates streak (consecutive completed periods
// from most recent)
// pausePeriodsOverride: optional list of pauses; if omitted, uses goal.goalPauses
const calculateHabitConsistency = async (
    userId,
    goal,
    startDate,
    endDate,
    includeStreak = true,
    timezone = null,
    pausePeriodsOverride = undefined,
) => {
  if (goal.type !== "habit" || !goal.cadence) {
    return null;
  }

  const periods = [];
  let currentBoundaries = getPeriodBoundaries(goal.cadence, null, timezone);

  // If end date is in the future, use current period as end
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

  const pausePeriodsList = normalizePausePeriodsFromGoal(goal, pausePeriodsOverride);
  const nowForPause = new Date();

  // Start from current period and go back until we're before startDate
  let periodIndex = 0;
  while (currentBoundaries.start >= goalStartDate) {
    // Only include periods that overlap with the date range
    if (currentBoundaries.end > goalStartDate &&
        currentBoundaries.start <= effectiveEndDate) {
      if (!isPeriodPaused(
          currentBoundaries.start,
          currentBoundaries.end,
          pausePeriodsList,
          nowForPause,
      )) {
        const entries = await getGoalEntries(
            userId,
            goal.id,
            currentBoundaries.start,
            currentBoundaries.end,
        );

        const completed = goal.measure === "count" ?
          entries.length >= goal.targetCount :
          entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >=
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

    // Safety limit to prevent infinite loops
    if (periodIndex > 100) break;
  }

  if (periods.length === 0 && implicitSuccessCount === 0) {
    return {
      consistencyRate: 0,
      streak: includeStreak ? 0 : undefined,
      periods: [],
    };
  }

  const completedCount = periods.filter((p) => p.completed).length + implicitSuccessCount;
  const totalPeriods = periods.length + implicitSuccessCount;
  const consistencyRate = totalPeriods > 0 ? (completedCount / totalPeriods) * 100 : 0;

  const result = {
    consistencyRate,
    periods,
  };

  // Calculate streak (consecutive completed periods from most recent) if requested
  if (includeStreak) {
    let streak = 0;
    for (const period of periods) {
      if (period.completed) {
        streak++;
      } else {
        break;
      }
    }
    result.streak = streak;
  }

  return result;
};

module.exports = {
  getGoalEntries,
  getPeriodBoundaries,
  getPreviousPeriodBoundaries,
  calculateHabitWeight,
  getGoalStartDate,
  getImplicitSuccessCount,
  isPeriodPaused,
  calculateHabitConsistency,
};

