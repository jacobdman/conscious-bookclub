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

// Calculate consistency score for a habit goal over date range
// includeStreak: if true, calculates streak (consecutive completed periods
// from most recent)
const calculateHabitConsistency = async (
    userId,
    goal,
    startDate,
    endDate,
    includeStreak = true,
    timezone = null,
) => {
  if (goal.type !== "habit" || !goal.cadence) {
    return null;
  }

  const periods = [];
  let currentBoundaries = getPeriodBoundaries(goal.cadence, null, timezone);

  // If end date is in the future, use current period as end
  const effectiveEndDate = endDate && endDate < new Date() ? endDate : new Date();

  // Start from current period and go back until we're before startDate
  let periodIndex = 0;
  while (currentBoundaries.start >= (startDate || new Date(0))) {
    // Only include periods that overlap with the date range
    if (currentBoundaries.end > (startDate || new Date(0)) &&
        currentBoundaries.start <= effectiveEndDate) {
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

    currentBoundaries = getPreviousPeriodBoundaries(
        goal.cadence,
        currentBoundaries.start,
        timezone,
    );
    periodIndex++;

    // Safety limit to prevent infinite loops
    if (periodIndex > 100) break;
  }

  if (periods.length === 0) {
    return {
      consistencyRate: 0,
      streak: includeStreak ? 0 : undefined,
      periods: [],
    };
  }

  const completedCount = periods.filter((p) => p.completed).length;
  const consistencyRate = (completedCount / periods.length) * 100;

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
  calculateHabitConsistency,
};

