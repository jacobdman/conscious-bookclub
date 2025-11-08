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

// Helper function to check if goal is incomplete for today
const isGoalIncompleteToday = async (userId, goalId) => {
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
      goalId,
      occurredAt: {
        [db.Sequelize.Op.gte]: startOfDay,
        [db.Sequelize.Op.lt]: endOfDay,
      },
    },
  });

  return entries.length === 0;
};

// Helper function to send push notification
const sendPushNotification = async (subscription, title, body) => {
  try {
    const payload = JSON.stringify({
      title,
      body,
      icon: "/android-chrome-192x192.png",
      badge: "/android-chrome-192x192.png",
    });

    await webpush.sendNotification(subscription, payload);
    console.log("Push notification sent successfully");
  } catch (error) {
    console.error("Error sending push notification:", error);
    // If subscription is invalid, delete it
    if (error.statusCode === 410 || error.statusCode === 404) {
      await db.PushSubscription.destroy({
        where: {
          subscriptionJson: subscription,
        },
      });
    }
  }
};

// Scheduled function to send daily goal reminders
exports.dailyGoalReminder = onSchedule(
    {
      schedule: "0 * * * *", // Every hour
      timeZone: "UTC",
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

        const now = new Date();
        const currentHour = now.getUTCHours();
        const currentMinute = now.getUTCMinutes();

        for (const user of users) {
          // Check if it's time to send notification for this user
          if (!user.dailyGoalNotificationTime) {
            continue;
          }

          // Parse notification time (format: "HH:MM:SS" or "HH:MM")
          const [hours, minutes] = user.dailyGoalNotificationTime.split(":").map(Number);

          // Get user's timezone or default to UTC
          const userTimezone = user.timezone || "UTC";

          // Convert user's local time to UTC
          // For simplicity, we'll check if current UTC time matches
          // In a production system, you'd want to use a timezone library like moment-timezone
          let targetHour = hours;
          let targetMinute = minutes || 0;

          // Simple timezone offset calculation (this is simplified - in production use proper timezone library)
          if (userTimezone !== "UTC") {
            // This is a simplified approach - in production, use a proper timezone library
            // For now, we'll just check if the hour matches (assuming user set time in their local timezone)
            // The proper implementation would convert the user's local time to UTC
          }

          // Check if current time matches user's notification time (within 5 minute window)
          const timeMatch = Math.abs(currentHour - targetHour) === 0 &&
            Math.abs(currentMinute - targetMinute) <= 5;

          if (!timeMatch) {
            continue;
          }

          // Get user's push subscriptions
          const subscriptions = await db.PushSubscription.findAll({
            where: {userId: user.uid},
          });

          if (subscriptions.length === 0) {
            continue;
          }

          // Get user's daily goals
          const dailyGoals = await db.Goal.findAll({
            where: {
              userId: user.uid,
              cadence: "day",
              archived: false,
              completed: false,
            },
          });

          if (dailyGoals.length === 0) {
            continue;
          }

          // Check which goals are incomplete
          const incompleteGoals = [];
          for (const goal of dailyGoals) {
            const incomplete = await isGoalIncompleteToday(user.uid, goal.id);
            if (incomplete) {
              incompleteGoals.push(goal);
            }
          }

          if (incompleteGoals.length === 0) {
            continue;
          }

          // Send notification to all subscriptions
          const title = "Daily Goals Reminder";
          const body = `Don't forget to check off your ${incompleteGoals.length} daily goal${incompleteGoals.length > 1 ? "s" : ""} today!`;

          for (const subscription of subscriptions) {
            await sendPushNotification(
                subscription.subscriptionJson,
                title,
                body,
            );
          }
        }

        console.log("Daily goal reminder function completed");
      } catch (error) {
        console.error("Error in daily goal reminder function:", error);
        throw error;
      }
    },
);

