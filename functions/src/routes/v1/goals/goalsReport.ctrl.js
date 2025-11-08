const db = require("../../../../db/models/index");

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
      break;
  }

  return {start: prevStart, end: prevEnd};
};

// Calculate consistency score for a habit goal over date range
const calculateHabitConsistency = async (userId, goal, startDate, endDate) => {
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
      streak: 0,
      periods: [],
    };
  }

  const completedCount = periods.filter((p) => p.completed).length;
  const consistencyRate = (completedCount / periods.length) * 100;

  return {
    consistencyRate,
    periods,
  };
};

// Calculate habit weight based on position among habits only
const calculateHabitWeight = (habitPosition) => {
  // weight_n = 1 / log2(n + 1)
  return 1 / Math.log2(habitPosition + 1);
};

// GET /v1/goals/report?userId=xxx&clubId=xxx&startDate=xxx&endDate=xxx - Get personal goals report
const getPersonalGoalsReport = async (req, res, next) => {
  try {
    const userId = req.query.userId;
    const clubId = req.query.clubId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    // Default to current quarter if no date range provided
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const defaultStartDate = new Date(now.getFullYear(), quarter * 3, 1);
    const defaultEndDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    defaultEndDate.setHours(23, 59, 59, 999);

    const effectiveStartDate = startDate || defaultStartDate;
    const effectiveEndDate = endDate || defaultEndDate;

    // Get all goals for this user in this club
    const goals = await db.Goal.findAll({
      where: {
        userId,
        clubId: parseInt(clubId),
        archived: false,
      },
      include: [
        {
          model: db.Milestone,
          as: "milestones",
          attributes: ["id", "title", "done", "doneAt"],
        },
      ],
      order: [["created_at", "ASC"]],
    });

    const userGoals = goals.map((g) => g.toJSON());

    // Filter to habit goals only
    const habitGoals = userGoals.filter((g) => g.type === "habit");

    // Calculate consistency rate for each habit and sort by consistency rate
    const habitsWithConsistency = await Promise.all(
        habitGoals.map(async (goal) => {
          const consistency = await calculateHabitConsistency(
              userId,
              goal,
              effectiveStartDate,
              effectiveEndDate,
          );
          return {
            goal,
            consistencyRate: consistency ? consistency.consistencyRate : 0,
            consistency,
          };
        }),
    );

    // Sort by consistency rate (descending), then by creation date (oldest first) for tie-breaking
    habitsWithConsistency.sort((a, b) => {
      if (b.consistencyRate !== a.consistencyRate) {
        return b.consistencyRate - a.consistencyRate;
      }
      // Tie-breaking: sort by creation date (oldest first)
      const dateA = new Date(a.goal.created_at || a.goal.createdAt || 0);
      const dateB = new Date(b.goal.created_at || b.goal.createdAt || 0);
      return dateA - dateB;
    });

    // Calculate weighted habit consistency
    // Assign habit-specific positions (1, 2, 3...) based on sorted order
    let weightedSum = 0;
    let totalWeight = 0;
    const habitDetails = [];

    for (let i = 0; i < habitsWithConsistency.length; i++) {
      const {goal, consistencyRate, consistency} = habitsWithConsistency[i];
      const habitPosition = i + 1; // Position among habits only (1, 2, 3...)
      const weight = calculateHabitWeight(habitPosition);

      if (consistency) {
        weightedSum += consistencyRate * weight;
        totalWeight += weight;
        habitDetails.push({
          goalId: goal.id,
          title: goal.title,
          habitPosition,
          weight,
          consistencyRate,
        });
      }
    }

    const weightedHabitConsistency = totalWeight > 0 ? weightedSum / totalWeight : 0;

    // Calculate weekly completion trend
    // Get all goals with weekly cadence
    const weeklyGoals = userGoals.filter((g) => g.cadence === "week");
    const weeklyTrend = [];

    if (weeklyGoals.length > 0) {
      // Generate weeks in date range
      let currentWeekStart = new Date(effectiveStartDate);
      const dayOfWeek = currentWeekStart.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - daysToMonday);
      currentWeekStart.setUTCHours(0, 0, 0, 0);

      while (currentWeekStart <= effectiveEndDate) {
        const weekEnd = new Date(currentWeekStart);
        weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

        let completedCount = 0;
        let totalCount = 0;

        for (const goal of weeklyGoals) {
          const entries = await getGoalEntries(
              userId,
              goal.id,
              currentWeekStart,
              weekEnd,
          );

          const completed = goal.measure === "count" ?
            entries.length >= goal.targetCount :
            entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >=
              parseFloat(goal.targetQuantity);

          totalCount++;
          if (completed) {
            completedCount++;
          }
        }

        const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        weeklyTrend.push({
          weekStart: currentWeekStart.toISOString(),
          weekEnd: weekEnd.toISOString(),
          completionRate,
          completed: completedCount,
          total: totalCount,
        });

        currentWeekStart = new Date(weekEnd);
      }
    }

    // Calculate goal type distribution
    const goalTypeDistribution = {
      habit: userGoals.filter((g) => g.type === "habit" && !g.completed).length,
      metric: userGoals.filter((g) => g.type === "metric" && !g.completed).length,
      milestone: userGoals.filter((g) => g.type === "milestone" && !g.completed).length,
      oneTime: userGoals.filter((g) => g.type === "one_time" && !g.completed).length,
    };

    res.json({
      habitConsistency: {
        weightedAverage: weightedHabitConsistency,
        habitDetails,
      },
      weeklyTrend,
      goalTypeDistribution,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getPersonalGoalsReport,
};

