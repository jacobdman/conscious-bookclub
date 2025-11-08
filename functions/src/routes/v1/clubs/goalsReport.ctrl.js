const db = require("../../../../db/models/index");
const {
  getGoalEntries,
  getPeriodBoundaries,
  calculateHabitWeight,
  calculateHabitConsistency,
} = require("../../../../utils/goalHelpers");

// Helper function to verify user is member of club
const verifyMembership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId},
  });
  return membership;
};


// GET /v1/clubs/:clubId/goals-report?userId=xxx&startDate=xxx&endDate=xxx
// &includeAnalytics=true&includeWeeklyTrend=true - Get club goals report
const getClubGoalsReport = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    const startDate = req.query.startDate ? new Date(req.query.startDate) : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;
    const includeAnalytics = req.query.includeAnalytics === "true";
    const includeWeeklyTrend = req.query.includeWeeklyTrend === "true";

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
                true, // includeStreak
            );
            return {
              goal,
              consistencyRate: consistency ? consistency.consistencyRate : 0,
              consistency,
            };
          }),
      );

      // Sort by consistency rate (descending), then by creation date
      // (oldest first) for tie-breaking
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

    // Cache all goals for all members to avoid N×M queries
    const goalsCache = new Map();
    if (includeWeeklyTrend || includeAnalytics) {
      // Fetch all goals for all members at once
      const allGoals = await db.Goal.findAll({
        where: {
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

      // Group goals by userId
      for (const goal of allGoals) {
        const userId = goal.userId;
        if (!goalsCache.has(userId)) {
          goalsCache.set(userId, []);
        }
        goalsCache.get(userId).push(goal.toJSON());
      }
    }

    // Calculate weekly completion trend by member (only if requested)
    let weeklyTrendByMember = null;
    if (includeWeeklyTrend && members.length > 0) {
      weeklyTrendByMember = [];
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

          // Get habit goals from cache
          const memberGoals = goalsCache.get(memberUserId) || [];
          const habitGoals = memberGoals.filter((g) => g.type === "habit");

          if (habitGoals.length > 0) {
            // Calculate consistency for each habit
            // Capture currentWeekStart to avoid unsafe reference in loop
            const weekStart = currentWeekStart;
            const habitsWithConsistency = await Promise.all(
                habitGoals.map(async (goal) => {
                  const consistency = await calculateHabitConsistency(
                      memberUserId,
                      goal,
                      weekStart,
                      weekEnd,
                      false, // includeStreak - not needed for weekly trend
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
    let bookCompletionPercentage = null;

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

            // Get goals from cache
            const goals = goalsCache.get(memberUserId) || [];

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


      // Calculate club-wide goal type distribution (use cached goals)
      clubGoalTypeDistribution = {
        habit: 0,
        metric: 0,
        milestone: 0,
        oneTime: 0,
      };

      for (const member of members) {
        const goals = goalsCache.get(member.userId) || [];

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

      // Calculate book completion percentage
      // Get all books for the club with past discussion dates
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const pastBooks = await db.Book.findAll({
        where: {
          clubId: parseInt(clubId),
          discussionDate: {
            [db.Op.lt]: today,
            [db.Op.ne]: null,
          },
        },
      });

      if (pastBooks.length > 0) {
        let completedBooks = 0;

        // Check each book to see if at least one member finished it
        for (const book of pastBooks) {
          const finishedProgress = await db.BookProgress.findOne({
            where: {
              bookId: book.id,
              status: "finished",
            },
          });

          if (finishedProgress) {
            completedBooks++;
          }
        }

        bookCompletionPercentage = (completedBooks / pastBooks.length) * 100;
      } else {
        // No past books, set to null or 0
        bookCompletionPercentage = null;
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
      topPerformers,
    };

    if (includeWeeklyTrend && weeklyTrendByMember !== null) {
      response.weeklyTrendByMember = weeklyTrendByMember;
    }

    if (includeAnalytics) {
      response.averageCompletionByType = averageCompletionByType;
      response.participationHeatmap = participationHeatmap;
      response.clubGoalTypeDistribution = clubGoalTypeDistribution;
      response.bookCompletionPercentage = bookCompletionPercentage;
    }

    res.json(response);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getClubGoalsReport,
};

