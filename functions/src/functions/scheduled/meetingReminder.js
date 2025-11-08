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

// Helper function to format date
const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Scheduled function to send meeting reminders
exports.meetingReminder = onSchedule(
    {
      schedule: "0 * * * *", // Every hour
      timeZone: "UTC",
    },
    async (event) => {
      console.log("Meeting reminder function triggered");

      // Check if VAPID keys are configured
      if (!vapidPublicKey || !vapidPrivateKey) {
        console.log("VAPID keys not configured, skipping meeting reminders");
        return;
      }

      try {
        const now = new Date();
        const oneDayFromNow = new Date(now);
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
        const oneWeekFromNow = new Date(now);
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

        // Get all meetings
        const meetings = await db.Meeting.findAll({
          include: [
            {
              model: db.Book,
              as: "book",
            },
          ],
        });

        for (const meeting of meetings) {
          const meetingDate = new Date(meeting.date);
          const daysUntilMeeting = Math.ceil(
              (meetingDate - now) / (1000 * 60 * 60 * 24),
          );

          let shouldNotify = false;
          let daysText = "";

          // Check if we should send 1 day before notification
          if (meeting.notifyOneDayBefore && daysUntilMeeting === 1) {
            shouldNotify = true;
            daysText = "1 day";
          }

          // Check if we should send 1 week before notification
          if (meeting.notifyOneWeekBefore && daysUntilMeeting === 7) {
            shouldNotify = true;
            daysText = "1 week";
          }

          if (!shouldNotify) {
            continue;
          }

          // Get all club members for this meeting's club
          const clubMembers = await db.ClubMember.findAll({
            where: {clubId: meeting.clubId},
            include: [
              {
                model: db.User,
                as: "user",
              },
            ],
          });

          // Filter to users who have notifications enabled
          // For meeting notifications, we check if user has any notifications enabled
          // (using dailyGoalNotificationsEnabled as the global notification toggle)
          const usersToNotify = [];
          for (const member of clubMembers) {
            if (member.user) {
              const user = await db.User.findByPk(member.user.uid);
              if (user && user.dailyGoalNotificationsEnabled) {
                usersToNotify.push(user);
              }
            }
          }

          if (usersToNotify.length === 0) {
            continue;
          }

          // Prepare notification message
          const bookTitle = meeting.book ? meeting.book.title : "your book club";
          const meetingDateFormatted = formatDate(meeting.date);
          const title = "Meeting Reminder";
          const body =
            `Your book club meeting for "${bookTitle}" is in ${daysText} ` +
            `on ${meetingDateFormatted}`;

          // Send notifications to all users
          for (const user of usersToNotify) {
            const subscriptions = await db.PushSubscription.findAll({
              where: {userId: user.uid},
            });

            for (const subscription of subscriptions) {
              await sendPushNotification(
                  subscription.subscriptionJson,
                  title,
                  body,
              );
            }
          }
        }

        console.log("Meeting reminder function completed");
      } catch (error) {
        console.error("Error in meeting reminder function:", error);
        throw error;
      }
    },
);

