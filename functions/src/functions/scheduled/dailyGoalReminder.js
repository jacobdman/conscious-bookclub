const {onSchedule} = require("firebase-functions/v2/scheduler");
const db = require("../../../db/models/index");
const {sendNotificationsToUser} = require("../../utils/pushSender");

const GOALS_NOTIFICATION_ICON =
  "https://firebasestorage.googleapis.com/v0/b/conscious-bookclub-87073-9eb71" +
  ".firebasestorage.app/o/app-icons%2Fgoals-notification-icon.jpg?alt=media" +
  "&token=278fbb7f-022f-4794-8808-9a46b218fa21";

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
  // Optionally, we could check if they're behind on weekly target
  if (goal.cadence === "week") {
    // Always remind for weekly goals since they need daily tracking
    // You could add logic here to check if they're behind on weekly target
    return true;
  }

  // For other cadences, don't remind (or add logic as needed)
  return false;
};

// Scheduled function to send daily goal reminders
exports.dailyGoalReminder = onSchedule(
    {
      schedule: "0 * * * *", // Every hour
      timeZone: "UTC",
      // Optimize for faster deployments and better performance
      region: "us-central1",
      maxInstances: 1, // Only one instance needed for scheduled tasks
      memory: "512MiB", // Sufficient for database queries and notifications
      timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
    },
    async (event) => {
      console.log("Daily goal reminder function triggered");

      try {
        // Get all users with notifications enabled
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
        };

        for (const user of users) {
          usersProcessed++;
          console.log(`Processing user ${user.uid} (${usersProcessed}/${users.length})`);

          // Check if it's time to send notification for this user
          if (!user.dailyGoalNotificationTime) {
            console.log(`  Skipping user ${user.uid}: no dailyGoalNotificationTime set`);
            skipReasons.noTimeSet++;
            usersSkipped++;
            continue;
          }

          // Parse notification time (format: "HH:MM:SS" or "HH:MM")
          const [hours, minutes = 0] = user.dailyGoalNotificationTime.split(":").map(Number);

          // Get user's timezone or default to UTC
          const userTimezone = user.timezone || "UTC";

          // Convert user's local notification time to UTC hour
          // Strategy: Calculate the timezone offset by comparing a known UTC time
          // to what it shows in the user's timezone, then apply that offset

          const today = new Date();
          const year = today.getUTCFullYear();
          const month = today.getUTCMonth();
          const day = today.getUTCDate();

          // Use a test UTC time (noon) and see what time it is in user's timezone
          // This tells us the offset
          const testUTC = new Date(Date.UTC(year, month, day, 12, 0, 0)); // Noon UTC
          const testInUserTz = new Intl.DateTimeFormat("en-US", {
            timeZone: userTimezone,
            hour: "2-digit",
            hour12: false,
          }).format(testUTC);
          const [testHour] = testInUserTz.split(":").map(Number);

          // Calculate offset: if 12:00 UTC shows as 5:00 in user's timezone,
          // then user's timezone is 7 hours behind UTC (offset = -7)
          // So: offset = testUTC - testInUserTz = 12 - 5 = 7 (but we need negative)
          // Actually: if 12 UTC = 5 local, then local is 7 hours behind, so offset = -7
          // Formula: offset = testInUserTz - testUTC (but in hours behind/ahead)
          // If testUTC is 12 and testInUserTz is 5, then offset = 5 - 12 = -7 ✓
          const tzOffset = testHour - 12;

          // Convert user's local notification time to UTC
          // If user wants 8 AM local and offset is -7, then UTC = 8 - (-7) = 15
          // Formula: UTC = local - offset
          const targetHourUTC = (hours - tzOffset + 24) % 24;

          // Check if current hour matches user's notification hour (converted to UTC)
          if (currentHour !== targetHourUTC) {
            const timeStr = `${hours}:${String(minutes).padStart(2, "0")}`;
            console.log(
                `  Skipping user ${user.uid}: hour mismatch ` +
                `(current UTC: ${currentHour}, target UTC: ${targetHourUTC} ` +
                `[${timeStr} ${userTimezone}], offset: ${tzOffset}h)`,
            );
            skipReasons.hourMismatch++;
            usersSkipped++;
            continue;
          }

          const [webN, nativeN] = await Promise.all([
            db.PushSubscription.count({where: {userId: user.uid}}),
            db.NativePushToken.count({where: {userId: user.uid}}),
          ]);

          if (webN === 0 && nativeN === 0) {
            console.log(`  Skipping user ${user.uid}: no web or native push targets`);
            skipReasons.noSubscriptions++;
            usersSkipped++;
            continue;
          }

          console.log(
              `  User ${user.uid} has ${webN} web subscription(s), ` +
              `${nativeN} native token(s)`,
          );

          // Get user's goals that need daily reminders (daily and weekly cadence)
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

          const dailyCount = goalsToCheck.filter((g) => g.cadence === "day").length;
          const weeklyCount = goalsToCheck.filter((g) => g.cadence === "week").length;
          console.log(
              `  User ${user.uid} has ${goalsToCheck.length} goal(s) ` +
              `(${dailyCount} daily, ${weeklyCount} weekly)`,
          );

          // Check which goals need reminders
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

          const dailyNeedingReminder = goalsNeedingReminder.filter(
              (g) => g.cadence === "day",
          ).length;
          const weeklyNeedingReminder = goalsNeedingReminder.filter(
              (g) => g.cadence === "week",
          ).length;

          console.log(
              `  User ${user.uid} has ${goalsNeedingReminder.length} goal(s) needing reminder ` +
              `(${dailyNeedingReminder} daily, ${weeklyNeedingReminder} weekly) ` +
              `out of ${goalsToCheck.length} total`,
          );

          // Send notification to all subscriptions
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
              `  Sent ${userNotificationsSent} notification(s) to user ${user.uid} ` +
              `for ${goalsNeedingReminder.length} goal(s) needing reminder`,
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

