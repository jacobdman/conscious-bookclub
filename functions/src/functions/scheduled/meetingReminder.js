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
      // Optimize for faster deployments and better performance
      region: "us-central1",
      maxInstances: 1, // Only one instance needed for scheduled tasks
      memory: "512MiB", // Sufficient for database queries and notifications
      timeoutSeconds: 540, // 9 minutes (max for scheduled functions)
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
        // Calculate dates for 1 day and 7 days from now (at start of day)
        const oneDayFromNow = new Date(now);
        oneDayFromNow.setUTCDate(oneDayFromNow.getUTCDate() + 1);
        oneDayFromNow.setUTCHours(0, 0, 0, 0);
        const oneDayFromNowStr = oneDayFromNow.toISOString().split("T")[0]; // YYYY-MM-DD

        const oneWeekFromNow = new Date(now);
        oneWeekFromNow.setUTCDate(oneWeekFromNow.getUTCDate() + 7);
        oneWeekFromNow.setUTCHours(0, 0, 0, 0);
        const oneWeekFromNowStr = oneWeekFromNow.toISOString().split("T")[0]; // YYYY-MM-DD

        // Get meetings with startTime that match the current hour
        const meetingsWithTime = await db.Meeting.findAll({
          where: {
            [db.Sequelize.Op.and]: [
              {
                date: {
                  [db.Sequelize.Op.in]: [oneDayFromNowStr, oneWeekFromNowStr],
                },
              },
              {
                startTime: {
                  [db.Sequelize.Op.ne]: null,
                },
              },
              // Match the hour: meeting hour must equal current hour
              db.Sequelize.literal(
                  "EXTRACT(HOUR FROM start_time) = EXTRACT(HOUR FROM NOW())",
              ),
            ],
          },
          include: [
            {
              model: db.Book,
              as: "book",
            },
          ],
        });

        // Get meetings without startTime - we'll check if it's 9am in owner's timezone
        const meetingsWithoutTime = await db.Meeting.findAll({
          where: {
            [db.Sequelize.Op.and]: [
              {
                date: {
                  [db.Sequelize.Op.in]: [oneDayFromNowStr, oneWeekFromNowStr],
                },
              },
              {
                startTime: null,
              },
            ],
          },
          include: [
            {
              model: db.Book,
              as: "book",
            },
          ],
        });

        // Filter meetings without time to only those where it's 9am in owner's timezone
        const validMeetingsWithoutTime = [];
        for (const meeting of meetingsWithoutTime) {
          // Get the club owner for this meeting
          const ownerMember = await db.ClubMember.findOne({
            where: {
              clubId: meeting.clubId,
              role: "owner",
            },
            include: [
              {
                model: db.User,
                as: "user",
                attributes: ["uid", "timezone"],
              },
            ],
          });

          if (!ownerMember || !ownerMember.user) {
            continue;
          }

          const ownerTimezone = ownerMember.user.timezone || "UTC";

          // Check if it's 9am in owner's timezone
          // Convert current UTC time to owner's timezone and check if hour is 9
          const currentTimeInOwnerTz = new Intl.DateTimeFormat("en-US", {
            timeZone: ownerTimezone,
            hour: "2-digit",
            hour12: false,
          }).format(now);
          const [hourInOwnerTz] = currentTimeInOwnerTz.split(":").map(Number);

          if (hourInOwnerTz === 9) {
            validMeetingsWithoutTime.push(meeting);
          }
        }

        // Combine both sets of meetings
        const meetings = [...meetingsWithTime, ...validMeetingsWithoutTime];

        console.log(
            `Found ${meetings.length} meeting(s) at notification time ` +
            `(${meetingsWithTime.length} with time, ` +
            `${validMeetingsWithoutTime.length} without time at 9am)`);

        let meetingsProcessed = 0;
        let meetingsSkipped = 0;
        let notificationsSent = 0;
        const skipReasons = {
          noUsersToNotify: 0,
          noSubscriptions: 0,
        };

        for (const meeting of meetings) {
          meetingsProcessed++;
          // Determine reminder type based on which target date the meeting matches
          // Since SQL already filtered by date and hour, we can determine type from date string
          // DATEONLY fields in Sequelize are returned as strings in YYYY-MM-DD format
          const meetingDateStr = typeof meeting.date === "string" ?
            meeting.date :
            new Date(meeting.date).toISOString().split("T")[0];
          const shouldNotifyOneDay = meetingDateStr === oneDayFromNowStr;
          const reminderType = shouldNotifyOneDay ? "oneDayBefore" : "oneWeekBefore";
          const daysText = shouldNotifyOneDay ? "1 day" : "1 week";

          const timeInfo = meeting.startTime ?
            `hour: ${meeting.startTime}` :
            "no startTime (9am in owner timezone)";
          console.log(
              `Processing meeting ${meeting.id} (${meetingsProcessed}/${meetings.length}): ` +
              `"${meeting.book ? meeting.book.title : "Unknown"}" ` +
              `(${daysText} away, ${timeInfo})`,
          );

          // Build SQL filter for users with appropriate notification preferences
          // For 1 day: enabled=true AND oneDayBefore=true
          // For 7 days: enabled=true AND oneWeekBefore=true
          const notificationFilter = db.Sequelize.literal(
              "(notification_settings->'meetings'->>'enabled' = 'true' AND " +
              `notification_settings->'meetings'->>'${reminderType}' = 'true')`,
          );

          // Get club members with notifications enabled (filtered at SQL level)
          const clubMembers = await db.ClubMember.findAll({
            where: {clubId: meeting.clubId},
            include: [
              {
                model: db.User,
                as: "user",
                where: notificationFilter,
                required: true, // INNER JOIN - only get members with matching notification settings
              },
            ],
          });

          const memberCount = clubMembers.length;
          console.log(
              `  Meeting ${meeting.id} has ${memberCount} club member(s) ` +
              "with notifications enabled",
          );

          if (memberCount === 0) {
            console.log(
                `  Skipping meeting ${meeting.id}: no users with meeting notifications enabled`,
            );
            skipReasons.noUsersToNotify++;
            meetingsSkipped++;
            continue;
          }

          // Prepare notification message
          const bookTitle = meeting.book ? meeting.book.title : "your book club";
          const meetingDateFormatted = formatDate(meeting.date);

          // Send notifications to all filtered users
          let meetingNotificationsSent = 0;
          for (const member of clubMembers) {
            if (!member.user) continue;

            const subscriptions = await db.PushSubscription.findAll({
              where: {userId: member.user.uid},
            });

            if (subscriptions.length === 0) {
              console.log(`    User ${member.user.uid} has no push subscriptions`);
              skipReasons.noSubscriptions++;
              continue;
            }

            console.log(`    User ${member.user.uid} has ${subscriptions.length} subscription(s)`);

            // Send notification
            const notificationBody =
                `Your book club meeting for "${bookTitle}" is in ${daysText} ` +
                `on ${meetingDateFormatted}`;
            const notification = {
              title: "Meeting Reminder",
              body: notificationBody,
            };

            for (const subscription of subscriptions) {
              const result = await sendPushNotification(
                  subscription.subscriptionJson,
                  notification.title,
                  notification.body,
              );
              if (result && result.success) {
                meetingNotificationsSent++;
                notificationsSent++;
              }
            }
          }

          console.log(
              `  Sent ${meetingNotificationsSent} notification(s) for meeting ${meeting.id} ` +
              `to ${clubMembers.length} user(s)`,
          );
        }

        console.log("Meeting reminder function completed");
        console.log(`Summary: ${meetingsProcessed} meetings processed, ` +
            `${notificationsSent} notifications sent, ${meetingsSkipped} meetings skipped`);
        console.log(`Skip reasons:`, skipReasons);
      } catch (error) {
        console.error("Error in meeting reminder function:", error);
        throw error;
      }
    },
);

