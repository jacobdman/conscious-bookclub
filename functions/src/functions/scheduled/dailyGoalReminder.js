const {onSchedule} = require("firebase-functions/v2/scheduler");
const db = require("../../../db/models/index");
const {sendNotificationsToUser} = require("../../utils/pushSender");
const {goalsNotificationsEnabled} = require("../../utils/defaultNotificationSettings");
const {
  isUserLocalHour,
  isUserGoalReminderUtcHour,
  getGoalNotificationHourFromUser,
} = require("../../utils/userLocalTime");
const {userHasDailyHabitStreakAtRisk} = require("../../utils/habitStreakAtRisk");

const GOALS_NOTIFICATION_ICON =
  "https://firebasestorage.googleapis.com/v0/b/conscious-bookclub-87073-9eb71" +
  ".firebasestorage.app/o/app-icons%2Fgoals-notification-icon.jpg?alt=media" +
  "&token=278fbb7f-022f-4794-8808-9a46b218fa21";

const STREAK_COPY = {
  20: {
    title: "Goals · Streak",
    body: "🔥 Update your goals now to keep your streak going!",
  },
  22: {
    title: "Goals · Last chance",
    body: "⏰ Last chance to keep your streak tonight!",
  },
};

// Helper function to check if goal needs a reminder
const goalNeedsReminder = async (userId, goal) => {
  // For daily goals, check if incomplete today
  if (goal.cadence === "day") {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate(),
    ));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const entries = await db.GoalEntry.findAll({
      where: {
        userId,
        goalId: goal.id,
        occurredAt: {
          [db.Sequelize.Op.gte]: startOfDay,
          [db.Sequelize.Op.lt]: endOfDay,
        },
      },
    });

    return entries.length === 0;
  }

  // For weekly goals, always remind (they need daily tracking)
  if (goal.cadence === "week") {
    return true;
  }

  return false;
};

const userHasPushTargets = async (userId) => {
  const [webN, nativeN] = await Promise.all([
    db.PushSubscription.count({where: {userId}}),
    db.NativePushToken.count({where: {userId}}),
  ]);
  return webN > 0 || nativeN > 0;
};

// Scheduled function to send daily goal reminders
exports.dailyGoalReminder = onSchedule(
    {
      schedule: "0 * * * *", // Every hour
      timeZone: "UTC",
      region: "us-central1",
      maxInstances: 1,
      memory: "512MiB",
      timeoutSeconds: 540,
    },
    async (event) => {
      console.log("Daily goal reminder function triggered");

      try {
        const users = await db.User.findAll({
          where: {
            dailyGoalNotificationsEnabled: true,
          },
        });

        console.log(`Found ${users.length} user(s) with daily goal notifications enabled`);

        const now = new Date();
        const currentHour = now.getUTCHours();
        console.log(`Current UTC hour: ${currentHour}`);

        let usersProcessed = 0;
        let usersSkipped = 0;
        let notificationsSent = 0;
        const skipReasons = {
          noTimeSet: 0,
          hourMismatch: 0,
          noSubscriptions: 0,
          noGoals: 0,
          allGoalsComplete: 0,
          streakNotAtRisk: 0,
        };

        for (const user of users) {
          usersProcessed++;
          console.log(`Processing user ${user.uid} (${usersProcessed}/${users.length})`);

          if (!goalsNotificationsEnabled(user)) {
            console.log(`  Skipping user ${user.uid}: goal notifications disabled in settings`);
            usersSkipped++;
            continue;
          }

          const hasTargets = await userHasPushTargets(user.uid);
          if (!hasTargets) {
            console.log(`  Skipping user ${user.uid}: no web or native push targets`);
            skipReasons.noSubscriptions++;
            usersSkipped++;
            continue;
          }

          let localHour = null;
          if (isUserLocalHour(user, 20, now)) {
            localHour = 20;
          } else if (isUserLocalHour(user, 22, now)) {
            localHour = 22;
          }

          if (localHour === 20 || localHour === 22) {
            const atRisk = await userHasDailyHabitStreakAtRisk(user.uid);
            if (atRisk) {
              const copy = STREAK_COPY[localHour];
              const {web, native} = await sendNotificationsToUser(
                  user.uid,
                  copy.title,
                  copy.body,
                  {route: "/goals", type: "goal"},
                  {icon: GOALS_NOTIFICATION_ICON, badge: GOALS_NOTIFICATION_ICON},
              );
              const sent =
                web.filter((r) => r.success).length +
                native.filter((r) => r.success).length;
              notificationsSent += sent;
              console.log(
                  `  Sent ${sent} streak reminder(s) to user ${user.uid} ` +
                  `at local hour ${localHour}`,
              );
              continue;
            }
            console.log(`  Skipping user ${user.uid}: no daily habit streak at risk`);
            skipReasons.streakNotAtRisk++;
            usersSkipped++;
            continue;
          }

          if (getGoalNotificationHourFromUser(user) == null) {
            console.log(`  Skipping user ${user.uid}: no goal notification time set`);
            skipReasons.noTimeSet++;
            usersSkipped++;
            continue;
          }

          if (!isUserGoalReminderUtcHour(user, now, currentHour)) {
            console.log(`  Skipping user ${user.uid}: not their daily reminder UTC hour`);
            skipReasons.hourMismatch++;
            usersSkipped++;
            continue;
          }

          const reminderLocalHour = getGoalNotificationHourFromUser(user);
          if (reminderLocalHour === 20 || reminderLocalHour === 22) {
            const atRisk = await userHasDailyHabitStreakAtRisk(user.uid);
            if (atRisk) {
              const copy = STREAK_COPY[reminderLocalHour];
              const {web, native} = await sendNotificationsToUser(
                  user.uid,
                  copy.title,
                  copy.body,
                  {route: "/goals", type: "goal"},
                  {icon: GOALS_NOTIFICATION_ICON, badge: GOALS_NOTIFICATION_ICON},
              );
              const sent =
                web.filter((r) => r.success).length +
                native.filter((r) => r.success).length;
              notificationsSent += sent;
              console.log(
                  `  Sent ${sent} streak-only reminder(s) (configured hour ${reminderLocalHour})`,
              );
              continue;
            }
          }

          const goalsToCheck = await db.Goal.findAll({
            where: {
              userId: user.uid,
              cadence: {
                [db.Sequelize.Op.in]: ["day", "week"],
              },
              archived: false,
              completed: false,
            },
          });

          if (goalsToCheck.length === 0) {
            console.log(`  Skipping user ${user.uid}: no daily or weekly goals found`);
            skipReasons.noGoals++;
            usersSkipped++;
            continue;
          }

          const goalsNeedingReminder = [];
          for (const goal of goalsToCheck) {
            const needsReminder = await goalNeedsReminder(user.uid, goal);
            if (needsReminder) {
              goalsNeedingReminder.push(goal);
            }
          }

          if (goalsNeedingReminder.length === 0) {
            console.log(`  Skipping user ${user.uid}: all goals are up to date`);
            skipReasons.allGoalsComplete++;
            usersSkipped++;
            continue;
          }

          const title = "Goals · Daily reminder";
          const goalText = goalsNeedingReminder.length > 1 ? "s" : "";
          const body =
            `Don't forget to update your ${goalsNeedingReminder.length} goal${goalText} today!`;

          const {web, native} = await sendNotificationsToUser(
              user.uid,
              title,
              body,
              {route: "/goals", type: "goal"},
              {icon: GOALS_NOTIFICATION_ICON, badge: GOALS_NOTIFICATION_ICON},
          );
          const userNotificationsSent =
            web.filter((r) => r.success).length +
            native.filter((r) => r.success).length;
          notificationsSent += userNotificationsSent;

          console.log(
              `  Sent ${userNotificationsSent} daily reminder(s) to user ${user.uid}`,
          );
        }

        console.log("Daily goal reminder function completed");
        console.log(`Summary: ${usersProcessed} users processed, ` +
            `${notificationsSent} notifications sent, ${usersSkipped} users skipped`);
        console.log(`Skip reasons:`, skipReasons);
      } catch (error) {
        console.error("Error in daily goal reminder function:", error);
        throw error;
      }
    },
);
