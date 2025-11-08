const db = require("../db/models/index");

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
const getPeriodBoundaries = (cadence, timestamp = null) => {
  const now = timestamp || new Date();
  const utcNow = new Date(now.toISOString());

  let start; let end;

  switch (cadence) {
    case "day": {
      start = new Date(Date.UTC(
          utcNow.getUTCFullYear(),
          utcNow.getUTCMonth(),
          utcNow.getUTCDate(),
      ));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    }
    case "week": {
      const dayOfWeek = utcNow.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(utcNow);
      monday.setUTCDate(utcNow.getUTCDate() - daysToMonday);
      start = new Date(Date.UTC(
          monday.getUTCFullYear(),
          monday.getUTCMonth(),
          monday.getUTCDate(),
      ));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      break;
    }
    case "month": {
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() + 1, 1));
      break;
    }
    case "quarter": {
      const quarter = Math.floor(utcNow.getUTCMonth() / 3);
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), quarter * 3, 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), (quarter + 1) * 3, 1));
      break;
    }
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }

  return {start, end};
};

// Helper to get previous period boundaries
const getPreviousPeriodBoundaries = (cadence, currentStart) => {
  const prevStart = new Date(currentStart);

  switch (cadence) {
    case "day":
      prevStart.setUTCDate(prevStart.getUTCDate() - 1);
      break;
    case "week":
      prevStart.setUTCDate(prevStart.getUTCDate() - 7);
      break;
    case "month":
      prevStart.setUTCMonth(prevStart.getUTCMonth() - 1);
      break;
    case "quarter":
      prevStart.setUTCMonth(prevStart.getUTCMonth() - 3);
      break;
    default:
      // Invalid cadence, but continue with original date
      break;
  }

  const prevEnd = new Date(prevStart);
  switch (cadence) {
    case "day":
      prevEnd.setUTCDate(prevEnd.getUTCDate() + 1);
      break;
    case "week":
      prevEnd.setUTCDate(prevEnd.getUTCDate() + 7);
      break;
    case "month":
      prevEnd.setUTCMonth(prevEnd.getUTCMonth() + 1);
      break;
    case "quarter":
      prevEnd.setUTCMonth(prevEnd.getUTCMonth() + 3);
      break;
    default:
      // Invalid cadence, but continue with original date
      break;
  }

  return {start: prevStart, end: prevEnd};
};

// Calculate habit weight based on position among habits only
const calculateHabitWeight = (habitPosition) => {
  // weight_n = 1 / log2(n + 1)
  return 1 / Math.log2(habitPosition + 1);
};

// Calculate consistency score for a habit goal over date range
// includeStreak: if true, calculates streak (consecutive completed periods from most recent)
const calculateHabitConsistency = async (userId, goal, startDate, endDate, includeStreak = true) => {
  if (goal.type !== "habit" || !goal.cadence) {
    return null;
  }

  const periods = [];
  let currentBoundaries = getPeriodBoundaries(goal.cadence);

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

    currentBoundaries = getPreviousPeriodBoundaries(goal.cadence, currentBoundaries.start);
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

