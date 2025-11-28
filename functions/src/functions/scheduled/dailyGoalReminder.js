const {onSchedule} = require("firebase-functions/v2/scheduler");
const db = require("../../../db/models/index");
const webpush = require("web-push");

// Configure web-push with VAPID keys (should be in environment variables)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@consciousbookclub.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

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

// Helper function to send push notification
const sendPushNotification = async (subscription, title, body) => {
  try {
    // Ensure subscription is an object (not a string)
    const subscriptionObj = typeof subscription === "string" ?
      JSON.parse(subscription) :
      subscription;

    const payload = JSON.stringify({
      title,
      body,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
    });

    console.log("Sending push notification to subscription:", {
      endpoint: subscriptionObj.endpoint ?
        subscriptionObj.endpoint.substring(0, 50) + "..." :
        "missing",
      keys: subscriptionObj.keys ? "present" : "missing",
    });

    const result = await webpush.sendNotification(subscriptionObj, payload);
    console.log("Push notification sent successfully, status:", result.statusCode);
    return {success: true, statusCode: result.statusCode};
  } catch (error) {
    console.error("Error sending push notification:", {
      message: error.message,
      statusCode: error.statusCode,
      body: error.body,
    });

    // If subscription is invalid, delete it
    if (error.statusCode === 410 || error.statusCode === 404) {
      const subscriptionObj = typeof subscription === "string" ?
        JSON.parse(subscription) :
        subscription;
      await db.PushSubscription.destroy({
        where: {
          subscriptionJson: subscriptionObj,
        },
      });
      console.log("Deleted invalid subscription");
    }
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
    };
  }
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

      // Check if VAPID keys are configured
      if (!vapidPublicKey || !vapidPrivateKey) {
        console.log("VAPID keys not configured, skipping daily goal reminders");
        return;
      }

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

          // Get user's push subscriptions
          const subscriptions = await db.PushSubscription.findAll({
            where: {userId: user.uid},
          });

          if (subscriptions.length === 0) {
            console.log(`  Skipping user ${user.uid}: no push subscriptions found`);
            skipReasons.noSubscriptions++;
            usersSkipped++;
            continue;
          }

          console.log(`  User ${user.uid} has ${subscriptions.length} subscription(s)`);

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
          const title = "Daily Goals Reminder";
          const goalText = goalsNeedingReminder.length > 1 ? "s" : "";
          const body =
            `Don't forget to update your ${goalsNeedingReminder.length} goal${goalText} today!`;

          let userNotificationsSent = 0;
          for (const subscription of subscriptions) {
            const result = await sendPushNotification(
                subscription.subscriptionJson,
                title,
                body,
            );
            if (result && result.success) {
              userNotificationsSent++;
              notificationsSent++;
            }
          }

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

