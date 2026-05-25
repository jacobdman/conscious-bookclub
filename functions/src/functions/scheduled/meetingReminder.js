const {onSchedule} = require("firebase-functions/v2/scheduler");
const db = require("../../../db/models/index");
const {sendNotificationsToUser, DEFAULT_APP_ICON} = require("../../utils/pushSender");
const {
  meetingsNotificationsEnabled,
  meetingsOneDayBeforeEnabled,
  meetingsOneWeekBeforeEnabled,
} = require("../../utils/defaultNotificationSettings");
const {
  getMeetingStartInstant,
  isReminderHourBeforeMeeting,
} = require("../../utils/meetingStart");
const {getUserTimezone} = require("../../utils/userLocalTime");

const formatDate = (date) => {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

/**
 * @param {number} clubId
 * @return {Promise<string>} Owner timezone or UTC
 */
const getClubOwnerTimezone = async (clubId) => {
  const ownerMember = await db.ClubMember.findOne({
    where: {clubId, role: "owner"},
    include: [
      {
        model: db.User,
        as: "user",
        attributes: ["timezone"],
      },
    ],
  });
  return getUserTimezone(ownerMember?.user);
};

exports.meetingReminder = onSchedule(
    {
      schedule: "0 * * * *",
      timeZone: "UTC",
      region: "us-central1",
      maxInstances: 1,
      memory: "512MiB",
      timeoutSeconds: 540,
    },
    async (event) => {
      console.log("Meeting reminder function triggered");

      try {
        const now = new Date();
        const windowEnd = new Date(now.getTime() + 8 * 24 * 3600 * 1000);
        const todayStr = now.toISOString().split("T")[0];
        const windowEndStr = windowEnd.toISOString().split("T")[0];

        const meetings = await db.Meeting.findAll({
          where: {
            date: {
              [db.Sequelize.Op.between]: [todayStr, windowEndStr],
            },
          },
          include: [
            {
              model: db.Book,
              as: "book",
            },
          ],
        });

        console.log(`Found ${meetings.length} meeting(s) in the next 8 days`);

        const ownerTzCache = new Map();

        let meetingsProcessed = 0;
        let meetingsSkipped = 0;
        let notificationsSent = 0;
        const skipReasons = {
          noReminderThisHour: 0,
          noUsersToNotify: 0,
          noSubscriptions: 0,
        };

        for (const meeting of meetings) {
          let fallbackTz = ownerTzCache.get(meeting.clubId);
          if (!fallbackTz) {
            fallbackTz = await getClubOwnerTimezone(meeting.clubId);
            ownerTzCache.set(meeting.clubId, fallbackTz);
          }

          const start = getMeetingStartInstant(meeting, fallbackTz);
          if (start <= now) {
            continue;
          }

          const notify24h = isReminderHourBeforeMeeting(start, now, 24);
          const notify7d = isReminderHourBeforeMeeting(start, now, 24 * 7);

          if (!notify24h && !notify7d) {
            skipReasons.noReminderThisHour++;
            continue;
          }

          meetingsProcessed++;

          const reminderType = notify24h ? "oneDayBefore" : "oneWeekBefore";
          const daysText = notify24h ? "1 day" : "1 week";

          const leadHours = notify24h ? 24 : 168;
          console.log(
              `Processing meeting ${meeting.id}: ` +
              `"${meeting.book ? meeting.book.title : "Unknown"}" ` +
              `(${daysText}, T-${leadHours}h)`,
          );

          const allMembers = await db.ClubMember.findAll({
            where: {clubId: meeting.clubId},
            include: [
              {
                model: db.User,
                as: "user",
                required: true,
              },
            ],
          });

          const clubMembers = allMembers.filter((member) => {
            if (!member.user) return false;
            const m = member.user.notificationSettings?.meetings || {};
            if (!meetingsNotificationsEnabled(m)) return false;
            if (reminderType === "oneDayBefore") {
              return meetingsOneDayBeforeEnabled(m);
            }
            return meetingsOneWeekBeforeEnabled(m);
          });

          if (clubMembers.length === 0) {
            skipReasons.noUsersToNotify++;
            meetingsSkipped++;
            continue;
          }

          const bookTitle = meeting.book ? meeting.book.title : "your book club";
          const meetingDateFormatted = formatDate(meeting.date);
          const notificationBody =
            `Your book club meeting for "${bookTitle}" is in ${daysText} ` +
            `on ${meetingDateFormatted}`;

          let meetingNotificationsSent = 0;
          for (const member of clubMembers) {
            if (!member.user) continue;

            const [webN, nativeN] = await Promise.all([
              db.PushSubscription.count({where: {userId: member.user.uid}}),
              db.NativePushToken.count({where: {userId: member.user.uid}}),
            ]);

            if (webN === 0 && nativeN === 0) {
              skipReasons.noSubscriptions++;
              continue;
            }

            const {web, native} = await sendNotificationsToUser(
                member.user.uid,
                "Meetings · Reminder",
                notificationBody,
                {route: "/meetings", type: "meeting"},
                {icon: DEFAULT_APP_ICON, badge: DEFAULT_APP_ICON},
            );
            meetingNotificationsSent +=
              web.filter((r) => r.success).length +
              native.filter((r) => r.success).length;
          }

          notificationsSent += meetingNotificationsSent;
          console.log(
              `  Sent ${meetingNotificationsSent} notification(s) for meeting ${meeting.id}`,
          );
        }

        console.log("Meeting reminder function completed");
        console.log(
            `Summary: ${meetingsProcessed} meetings processed, ` +
            `${notificationsSent} notifications sent, ${meetingsSkipped} meetings skipped`,
        );
        console.log("Skip reasons:", skipReasons);
      } catch (error) {
        console.error("Error in meeting reminder function:", error);
        throw error;
      }
    },
);
