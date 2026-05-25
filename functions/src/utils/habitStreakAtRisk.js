const db = require("../../db/models/index");
const {calculateHabitConsistency} = require("../../utils/goalHelpers");
const {getUserTimezone} = require("./userLocalTime");

/**
 * True if the user has at least one daily habit with a prior-day streak and today incomplete.
 * @param {string} userId
 * @param {string|null} [timezone] IANA; defaults from user row if omitted
 * @return {Promise<boolean>}
 */
const userHasDailyHabitStreakAtRisk = async (userId, timezone = null) => {
  let tz = timezone;
  if (!tz) {
    const user = await db.User.findByPk(userId, {attributes: ["timezone"]});
    tz = getUserTimezone(user);
  }

  const goals = await db.Goal.findAll({
    where: {
      userId,
      type: "habit",
      cadence: "day",
      archived: false,
      completed: false,
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
  });

  for (const goal of goals) {
    const goalJson = goal.toJSON();
    const result = await calculateHabitConsistency(
        userId,
        goalJson,
        null,
        null,
        false,
        tz,
    );
    if (!result?.periods?.length) continue;
    if (result.periods[0].completed) continue;

    let priorStreak = 0;
    for (let i = 1; i < result.periods.length; i++) {
      if (result.periods[i].completed) {
        priorStreak++;
      } else {
        break;
      }
    }
    if (priorStreak >= 1) {
      return true;
    }
  }

  return false;
};

module.exports = {
  userHasDailyHabitStreakAtRisk,
};
