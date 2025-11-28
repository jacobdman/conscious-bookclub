const db = require("../../../db/models/index");
const {
  getGoalEntries,
  getPeriodBoundaries,
  getPreviousPeriodBoundaries,
  calculateHabitWeight,
} = require("../../../utils/goalHelpers");

/**
 * Calculates club leaderboard with habit consistency scores and streaks
 *
 * SQL/Sequelize Query Logic:
 *
 * 1. SELECT club_members WHERE club_id = ?
 *    - JOIN users to get user details (uid, email, displayName, photoUrl)
 *
 * 2. For each club member:
 *    a. SELECT goals WHERE user_id = ? AND club_id = ? AND type = 'habit' AND archived = false
 *       - Get all habit goals for the member
 *
 *    b. For each habit goal:
 *       - Calculate period boundaries based on cadence
 *       - Start from current period and iterate backwards
 *       - EXCLUDE incomplete current periods (periods where end > now)
 *       - Only include periods that are fully complete
 *
 *    c. For each completed period:
 *       - SELECT goal_entry WHERE goal_id = ? AND user_id = ?
 *         AND occurred_at >= period_start AND occurred_at < period_end
 *       - Check if entries meet target
 *       - Mark period as completed or not
 *
 *    d. Calculate consistency rate per habit:
 *       - consistencyRate = (completed_periods / total_completed_periods) * 100
 *
 *    e. Sort habits by consistency rate (descending), then by creation date
 *
 *    f. Apply weighted averaging:
 *       - weight_n = 1 / log2(n + 1) where n is position (1, 2, 3...)
 *       - weightedAverage = SUM(consistencyRate * weight) / SUM(weight)
 *
 *    g. Calculate longest streak across all habits
 *
 * 3. Sort members by consistency score (descending)
 * 4. Create streak leaderboard (sorted by longest streak)
 *
 * @param {number} clubId - Club ID
 * @param {string} userId - User ID (for membership verification)
 * @param {Date} startDate - Start date for the report (optional, defaults to last 8 weeks)
 * @param {Date} endDate - End date for the report (optional, defaults to now)
 * @return {Promise<Object>} Report data with leaderboard and streakLeaderboard
 */
const getLeaderboardReport = async (clubId, userId, startDate = null, endDate = null) => {
  // Verify membership
  const membership = await db.ClubMember.findOne({
    where: {clubId: parseInt(clubId), userId},
  });
  if (!membership) {
    const error = new Error("Club not found or user is not a member");
    error.status = 404;
    throw error;
  }

  const now = new Date();
  const effectiveEndDate = endDate || now;

  // Default to last 8 weeks if no date range provided
  const defaultStartDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() - 56); // 8 weeks ago
    return date;
  })();
  const effectiveStartDate = startDate || defaultStartDate;

  // SQL Query 1: Get all club members
  // SELECT club_members.*, users.* FROM club_members
  // JOIN users ON club_members.user_id = users.uid
  // WHERE club_members.club_id = ?
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
  const habitMetrics = {byMember: []};
  const metricMetrics = {byMember: []};
  const milestoneMetrics = {byMember: []};

  // Process each member
  for (const member of members) {
    const memberUserId = member.userId;

    // SQL Query 2: Get ALL goals for this member in this club (not just habits)
    // SELECT * FROM goals
    // WHERE user_id = ? AND club_id = ? AND archived = false
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
      order: [["created_at", "ASC"]],
    });

    const memberGoals = goals.map((g) => g.toJSON());
    const habitGoals = memberGoals.filter((g) => g.type === "habit");

    if (habitGoals.length === 0) {
      // Member with no habit goals - add with zero score
      leaderboard.push({
        userId: memberUserId,
        user: {
          uid: member.user.uid,
          email: member.user.email,
          displayName: member.user.displayName,
          photoUrl: member.user.photoUrl,
        },
        consistencyScore: 0,
        streak: 0,
      });
      continue;
    }

    // Calculate consistency rate for each habit
    const habitsWithConsistency = await Promise.all(
        habitGoals.map(async (goal) => {
          if (!goal.cadence) {
            return {
              goal,
              consistencyRate: 0,
              consistency: null,
            };
          }

          const periods = [];
          let currentBoundaries = getPeriodBoundaries(goal.cadence);

          // Start from current period and go back until we're before startDate
          // CRITICAL: Exclude the current/incomplete period
          // Only include periods where end <= now (fully completed periods)
          let periodIndex = 0;
          while (currentBoundaries.start >= (effectiveStartDate || new Date(0))) {
          // Only include periods that:
          // 1. Overlap with the date range
          // 2. Are fully complete (end <= now) - EXCLUDE in-progress periods
            if (
              currentBoundaries.end > (effectiveStartDate || new Date(0)) &&
            currentBoundaries.start <= effectiveEndDate &&
            currentBoundaries.end <= now // EXCLUDE incomplete periods
            ) {
            // SQL Query 3: Get entries for this period
            // SELECT * FROM goal_entry
            // WHERE goal_id = ? AND user_id = ?
            // AND occurred_at >= ? AND occurred_at < ?
              const entries = await getGoalEntries(
                  memberUserId,
                  goal.id,
                  currentBoundaries.start,
                  currentBoundaries.end,
              );

              // Check if period is completed
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

          // Calculate consistency rate (only from completed periods)
          let consistencyRate = 0;
          let streak = 0;
          if (periods.length > 0) {
            const completedCount = periods.filter((p) => p.completed).length;
            consistencyRate = (completedCount / periods.length) * 100;

            // Calculate streak (consecutive completed periods from most recent)
            for (const period of periods) {
              if (period.completed) {
                streak++;
              } else {
                break;
              }
            }
          }

          return {
            goal,
            consistencyRate,
            consistency: {
              consistencyRate,
              streak,
              periods,
            },
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
      completionRate: totalMilestones > 0 ? (completedMilestones / totalMilestones) * 100 : 0,
      completed: completedMilestones,
      total: totalMilestones,
    });
  }

  // Sort leaderboard by consistency score (descending)
  leaderboard.sort((a, b) => b.consistencyScore - a.consistencyScore);
  leaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Create streak leaderboard (sorted by longest streak)
  const streakLeaderboard = [...leaderboard].sort((a, b) => b.streak - a.streak);
  streakLeaderboard.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Calculate top performers (uses existing metrics)
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

  return {
    leaderboard,
    streakLeaderboard,
    topPerformers,
  };
};

module.exports = getLeaderboardReport;

