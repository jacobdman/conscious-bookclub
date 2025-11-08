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


// GET /v1/clubs/:clubId/goals-report?userId=xxx&startDate=xxx&endDate=xxx&includeAnalytics=true - Get club goals report
const getClubGoalsReport = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const includeAnalytics = req.query.includeAnalytics === 'true';

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
    };
    const metricMetrics = {
      byMember: [],
    };
    const milestoneMetrics = {
      byMember: [],
    };
    const oneTimeMetrics = {
      byMember: [],
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

      // Calculate weighted habit consistency
      const habitGoals = memberGoals.filter((g) => g.type === "habit");
      
      // Calculate consistency rate for each habit and sort by consistency rate
      const habitsWithConsistency = await Promise.all(
          habitGoals.map(async (goal) => {
            const consistency = await calculateHabitConsistency(
                memberUserId,
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

      // Calculate weighted average
      let weightedSum = 0;
      let totalWeight = 0;
      let longestStreak = 0;

      for (let i = 0; i < habitsWithConsistency.length; i++) {
        const {consistencyRate, consistency} = habitsWithConsistency[i];
        const habitPosition = i + 1; // Position among habits only (1, 2, 3...)
        const weight = calculateHabitWeight(habitPosition);

        if (consistency) {
          weightedSum += consistencyRate * weight;
          totalWeight += weight;
          longestStreak = Math.max(longestStreak, consistency.streak);
        }
      }

      const avgConsistency = totalWeight > 0 ? weightedSum / totalWeight : 0;

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
    }

    // Sort leaderboard by consistency score
    leaderboard.sort((a, b) => b.consistencyScore - a.consistencyScore);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Create streak leaderboard (sorted by longestStreak)
    const streakLeaderboard = [...leaderboard].sort((a, b) => b.streak - a.streak);
    streakLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Calculate weekly completion trend by member
    const weeklyTrendByMember = [];
    if (members.length > 0) {
      // Generate weeks in date range
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

        // Calculate completion rate for each member for this week
        for (const member of members) {
          const memberUserId = member.userId;

          // Get all habit goals for this member
          const goals = await db.Goal.findAll({
            where: {
              userId: memberUserId,
              clubId: parseInt(clubId),
              type: "habit",
              archived: false,
            },
          });

          const habitGoals = goals.map((g) => g.toJSON());

          if (habitGoals.length > 0) {
            // Calculate consistency for each habit
            const habitsWithConsistency = await Promise.all(
                habitGoals.map(async (goal) => {
                  const consistency = await calculateHabitConsistency(
                      memberUserId,
                      goal,
                      currentWeekStart,
                      weekEnd,
                  );
                  return {
                    goal,
                    consistencyRate: consistency ? consistency.consistencyRate : 0,
                    consistency,
                  };
                }),
            );

            // Sort by consistency rate (descending), then by creation date (oldest first)
            habitsWithConsistency.sort((a, b) => {
              if (b.consistencyRate !== a.consistencyRate) {
                return b.consistencyRate - a.consistencyRate;
              }
              const dateA = new Date(a.goal.created_at || a.goal.createdAt || 0);
              const dateB = new Date(b.goal.created_at || b.goal.createdAt || 0);
              return dateA - dateB;
            });

            // Calculate weighted average
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
          } else {
            // Member with no habit goals
            weekData.members.push({
              userId: memberUserId,
              completionRate: 0,
              user: {
                uid: member.user.uid,
                displayName: member.user.displayName,
                photoUrl: member.user.photoUrl,
              },
            });
          }
        }

        weeklyTrendByMember.push(weekData);
        currentWeekStart = new Date(weekEnd);
      }
    }

    // Only calculate expensive analytics if requested
    let averageCompletionByType = null;
    let participationHeatmap = null;
    let clubGoalTypeDistribution = null;

    if (includeAnalytics) {
      // Calculate average completion by goal type
      averageCompletionByType = {
        habit: 0,
        metric: 0,
        milestone: 0,
        oneTime: 0,
      };

      if (habitMetrics.byMember.length > 0) {
        const habitSum = habitMetrics.byMember.reduce(
            (sum, member) => sum + (member.consistencyScore || 0),
            0,
        );
        averageCompletionByType.habit = habitSum / habitMetrics.byMember.length;
      }

      if (metricMetrics.byMember.length > 0) {
        const metricSum = metricMetrics.byMember.reduce(
            (sum, member) => sum + (member.progressPercentage || 0),
            0,
        );
        averageCompletionByType.metric = metricSum / metricMetrics.byMember.length;
      }

      if (milestoneMetrics.byMember.length > 0) {
        const milestoneSum = milestoneMetrics.byMember.reduce(
            (sum, member) => sum + (member.completionRate || 0),
            0,
        );
        averageCompletionByType.milestone = milestoneSum / milestoneMetrics.byMember.length;
      }

      if (oneTimeMetrics.byMember.length > 0) {
        const oneTimeSum = oneTimeMetrics.byMember.reduce(
            (sum, member) => sum + (member.completionRate || 0),
            0,
        );
        averageCompletionByType.oneTime = oneTimeSum / oneTimeMetrics.byMember.length;
      }

      // Calculate participation heatmap (weekly entry counts per member)
      participationHeatmap = [];
      if (members.length > 0) {
        // Generate weeks in date range
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

          // Count total goal entries for each member for this week
          for (const member of members) {
            const memberUserId = member.userId;

            // Get all goals for this member
            const goals = await db.Goal.findAll({
              where: {
                userId: memberUserId,
                clubId: parseInt(clubId),
                archived: false,
              },
            });

            let entryCount = 0;

            // Count entries for all goal types
            for (const goal of goals) {
              const entries = await getGoalEntries(
                  memberUserId,
                  goal.id,
                  currentWeekStart,
                  weekEnd,
              );
              entryCount += entries.length;
            }

            weekData.members.push({
              userId: memberUserId,
              entryCount,
              user: {
                uid: member.user.uid,
                displayName: member.user.displayName,
                photoUrl: member.user.photoUrl,
              },
            });
          }

          participationHeatmap.push(weekData);
          currentWeekStart = new Date(weekEnd);
        }
      }


      // Calculate club-wide goal type distribution
      clubGoalTypeDistribution = {
        habit: 0,
        metric: 0,
        milestone: 0,
        oneTime: 0,
      };

      for (const member of members) {
        const goals = await db.Goal.findAll({
          where: {
            userId: member.userId,
            clubId: parseInt(clubId),
            archived: false,
          },
        });

        for (const goal of goals) {
          const goalType = goal.type;
          if (goalType === "habit") {
            clubGoalTypeDistribution.habit++;
          } else if (goalType === "metric") {
            clubGoalTypeDistribution.metric++;
          } else if (goalType === "milestone") {
            clubGoalTypeDistribution.milestone++;
          } else if (goalType === "one_time") {
            clubGoalTypeDistribution.oneTime++;
          }
        }
      }
    }

    // Calculate top performers (uses existing metrics, so it's cheap)
    const topPerformers = {
      mostConsistent: null,
      topMetricEarner: null,
      milestoneMaster: null,
      streakChampion: null,
    };

    // Most Consistent (highest consistencyScore)
    if (habitMetrics.byMember.length > 0) {
      const mostConsistent = habitMetrics.byMember.reduce((max, member) => {
        return (member.consistencyScore || 0) > (max.consistencyScore || 0) ? member : max;
      }, habitMetrics.byMember[0]);
      topPerformers.mostConsistent = {
        userId: mostConsistent.userId,
        value: mostConsistent.consistencyScore,
        user: mostConsistent.user,
      };
    }

    // Top Metric Earner (highest progressPercentage)
    if (metricMetrics.byMember.length > 0) {
      const topMetricEarner = metricMetrics.byMember.reduce((max, member) => {
        return (member.progressPercentage || 0) > (max.progressPercentage || 0) ? member : max;
      }, metricMetrics.byMember[0]);
      topPerformers.topMetricEarner = {
        userId: topMetricEarner.userId,
        value: topMetricEarner.progressPercentage,
        user: topMetricEarner.user,
      };
    }

    // Milestone Master (most completed milestones)
    if (milestoneMetrics.byMember.length > 0) {
      const milestoneMaster = milestoneMetrics.byMember.reduce((max, member) => {
        return (member.completed || 0) > (max.completed || 0) ? member : max;
      }, milestoneMetrics.byMember[0]);
      topPerformers.milestoneMaster = {
        userId: milestoneMaster.userId,
        value: milestoneMaster.completed,
        user: milestoneMaster.user,
      };
    }

    // Streak Champion (longest streak)
    if (streakLeaderboard.length > 0) {
      const streakChampion = streakLeaderboard[0]; // Already sorted by streak
      topPerformers.streakChampion = {
        userId: streakChampion.userId,
        value: streakChampion.streak,
        user: streakChampion.user,
      };
    }

    const response = {
      leaderboard,
      streakLeaderboard,
      weeklyTrendByMember,
      topPerformers,
    };

    if (includeAnalytics) {
      response.averageCompletionByType = averageCompletionByType;
      response.participationHeatmap = participationHeatmap;
      response.clubGoalTypeDistribution = clubGoalTypeDistribution;
    }

    res.json(response);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getClubGoalsReport,
};

