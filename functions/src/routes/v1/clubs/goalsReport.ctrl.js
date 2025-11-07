const db = require("../../../../db/models/index");

// Helper function to verify user is member of club
const verifyMembership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId},
  });
  return membership;
};

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
        entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >= parseFloat(goal.targetQuantity);

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

  // Calculate streak (consecutive completed periods from most recent)
  let streak = 0;
  for (const period of periods) {
    if (period.completed) {
      streak++;
    } else {
      break;
    }
  }

  return {
    consistencyRate,
    streak,
    periods,
  };
};

// Calculate streak for a goal
const calculateStreak = async (userId, goal) => {
  if (goal.type !== "habit" || !goal.cadence) {
    return 0;
  }

  let streak = 0;
  let currentBoundaries = getPeriodBoundaries(goal.cadence);
  let hasMore = true;

  while (hasMore && streak < 100) { // Cap at 100 to prevent infinite loops
    const entries = await getGoalEntries(
        userId,
        goal.id,
        currentBoundaries.start,
        currentBoundaries.end,
    );

    const completed = goal.measure === "count" ?
      entries.length >= goal.targetCount :
      entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >= parseFloat(goal.targetQuantity);

    if (completed) {
      streak++;
      currentBoundaries = getPreviousPeriodBoundaries(goal.cadence, currentBoundaries.start);
    } else {
      hasMore = false;
    }
  }

  return streak;
};

// GET /v1/clubs/:clubId/goals-report?userId=xxx&startDate=xxx&endDate=xxx - Get club goals report
const getClubGoalsReport = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify membership
    const membership = await verifyMembership(parseInt(clubId), userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    // Default to last 8 weeks if no date range provided
    const effectiveStartDate = startDate || (() => {
      const date = new Date();
      date.setDate(date.getDate() - 56); // 8 weeks ago
      return date;
    })();
    const effectiveEndDate = endDate || new Date();

    // Get all club members
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

    const leaderboard = [];
    const habitMetrics = {
      byMember: [],
      timeSeries: [],
    };
    const metricMetrics = {
      byMember: [],
    };
    const milestoneMetrics = {
      byMember: [],
      clubWide: {completed: 0, total: 0},
    };
    const oneTimeMetrics = {
      byMember: [],
      clubWide: {completed: 0, total: 0},
    };

    // Process each member
    for (const member of members) {
      const memberUserId = member.userId;

      // Get all goals for this member in this club
      const goals = await db.Goal.findAll({
        where: {
          userId: memberUserId,
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
      });

      const memberGoals = goals.map((g) => g.toJSON());

      // Calculate habit consistency
      const habitGoals = memberGoals.filter((g) => g.type === "habit");
      const habitConsistencies = [];
      let longestStreak = 0;

      for (const goal of habitGoals) {
        const consistency = await calculateHabitConsistency(
            memberUserId,
            goal,
            effectiveStartDate,
            effectiveEndDate,
        );
        if (consistency) {
          habitConsistencies.push(consistency.consistencyRate);
          longestStreak = Math.max(longestStreak, consistency.streak);
        }
      }

      const avgConsistency = habitConsistencies.length > 0 ?
        habitConsistencies.reduce((a, b) => a + b, 0) / habitConsistencies.length : 0;

      // Calculate metric progress
      const metricGoals = memberGoals.filter((g) => g.type === "metric");
      const metricProgresses = [];

      for (const goal of metricGoals) {
        if (goal.cadence) {
          const boundaries = getPeriodBoundaries(goal.cadence);
          const entries = await getGoalEntries(
              memberUserId,
              goal.id,
              boundaries.start,
              boundaries.end,
          );

          const actual = entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0);
          const target = parseFloat(goal.targetQuantity) || 1;
          const progress = target > 0 ? (actual / target) * 100 : 0;
          metricProgresses.push(progress);
        }
      }

      const avgMetricProgress = metricProgresses.length > 0 ?
        metricProgresses.reduce((a, b) => a + b, 0) / metricProgresses.length : 0;

      // Calculate milestone completion
      const milestoneGoals = memberGoals.filter((g) => g.type === "milestone");
      let completedMilestones = 0;
      let totalMilestones = 0;

      for (const goal of milestoneGoals) {
        const milestones = goal.milestones || [];
        totalMilestones += milestones.length;
        completedMilestones += milestones.filter((m) => m.done).length;
      }

      const milestoneCompletionRate = totalMilestones > 0 ?
        (completedMilestones / totalMilestones) * 100 : 0;

      // Calculate one-time completion
      const oneTimeGoals = memberGoals.filter((g) => g.type === "one_time");
      const completedOneTime = oneTimeGoals.filter((g) => g.completed).length;
      const oneTimeCompletionRate = oneTimeGoals.length > 0 ?
        (completedOneTime / oneTimeGoals.length) * 100 : 0;

      // Add to leaderboard
      leaderboard.push({
        userId: memberUserId,
        user: {
          uid: member.user.uid,
          email: member.user.email,
          displayName: member.user.displayName,
          photoUrl: member.user.photoUrl,
        },
        consistencyScore: avgConsistency,
        streak: longestStreak,
      });

      // Add to metrics
      habitMetrics.byMember.push({
        userId: memberUserId,
        user: {
          displayName: member.user.displayName,
          photoUrl: member.user.photoUrl,
        },
        consistencyScore: avgConsistency,
        streak: longestStreak,
        goalCount: habitGoals.length,
      });

      metricMetrics.byMember.push({
        userId: memberUserId,
        user: {
          displayName: member.user.displayName,
          photoUrl: member.user.photoUrl,
        },
        progressPercentage: avgMetricProgress,
        goalCount: metricGoals.length,
      });

      milestoneMetrics.byMember.push({
        userId: memberUserId,
        user: {
          displayName: member.user.displayName,
          photoUrl: member.user.photoUrl,
        },
        completionRate: milestoneCompletionRate,
        completed: completedMilestones,
        total: totalMilestones,
      });
      milestoneMetrics.clubWide.completed += completedMilestones;
      milestoneMetrics.clubWide.total += totalMilestones;

      oneTimeMetrics.byMember.push({
        userId: memberUserId,
        user: {
          displayName: member.user.displayName,
          photoUrl: member.user.photoUrl,
        },
        completionRate: oneTimeCompletionRate,
        completed: completedOneTime,
        total: oneTimeGoals.length,
      });
      oneTimeMetrics.clubWide.completed += completedOneTime;
      oneTimeMetrics.clubWide.total += oneTimeGoals.length;
    }

    // Sort leaderboard by consistency score
    leaderboard.sort((a, b) => b.consistencyScore - a.consistencyScore);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Build time-series data for habit consistency (last 8 periods)
    // Aggregate across all members for each period
    const timeSeriesData = [];
    const allHabitGoals = [];

    for (const member of members) {
      const goals = await db.Goal.findAll({
        where: {
          userId: member.userId,
          clubId: parseInt(clubId),
          type: "habit",
          archived: false,
        },
      });
      allHabitGoals.push(...goals.map((g) => g.toJSON()));
    }

    // Get unique cadences
    const cadences = [...new Set(allHabitGoals.map((g) => g.cadence).filter(Boolean))];

    for (let periodIndex = 0; periodIndex < 8; periodIndex++) {
      let periodConsistencySum = 0;
      let periodCount = 0;

      for (const cadence of cadences) {
        const goalsForCadence = allHabitGoals.filter((g) => g.cadence === cadence);
        if (goalsForCadence.length === 0) continue;

        let currentBoundaries = getPeriodBoundaries(cadence);
        // Go back periodIndex periods
        for (let i = 0; i < periodIndex; i++) {
          currentBoundaries = getPreviousPeriodBoundaries(cadence, currentBoundaries.start);
        }

        for (const goal of goalsForCadence) {
          const entries = await getGoalEntries(
              goal.userId,
              goal.id,
              currentBoundaries.start,
              currentBoundaries.end,
          );

          const completed = goal.measure === "count" ?
            entries.length >= goal.targetCount :
            entries.reduce((sum, e) => sum + (parseFloat(e.quantity) || 0), 0) >= parseFloat(goal.targetQuantity);

          if (completed) {
            periodConsistencySum += 100;
          }
          periodCount++;
        }
      }

      const avgConsistency = periodCount > 0 ? periodConsistencySum / periodCount : 0;
      timeSeriesData.push({
        period: periodIndex,
        consistency: avgConsistency,
      });
    }

    habitMetrics.timeSeries = timeSeriesData.reverse(); // Most recent last

    res.json({
      leaderboard,
      metrics: {
        habit: habitMetrics,
        metric: metricMetrics,
        milestone: milestoneMetrics,
        oneTime: oneTimeMetrics,
      },
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getClubGoalsReport,
};

