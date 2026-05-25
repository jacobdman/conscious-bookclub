const {onSchedule} = require("firebase-functions/v2/scheduler");
const db = require("../../../db/models/index");
const {Op, QueryTypes} = db.Sequelize;
const {sendNotificationsToUser, DEFAULT_APP_ICON} = require("../../utils/pushSender");
const {
  meetingsNotificationsEnabled,
  meetingsOneDayBeforeEnabled,
} = require("../../utils/defaultNotificationSettings");
const {getCalendarDateDaysBeforeMeeting} = require("../../utils/meetingStart");
const {
  getUserLocalHour,
  getUserLocalDateString,
  getUserTimezone,
} = require("../../utils/userLocalTime");

const DISCOVERY_HOUR = 10;
const INTERACTION_SKIP_DAYS = 2;

/**
 * @param {number} clubId
 * @return {Promise<string>}
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

/**
 * @param {string} userId
 * @param {number} clubId
 * @param {Date} since
 * @return {Promise<boolean>}
 */
const hasRecentDiscoveryActivity = async (userId, clubId, since) => {
  const rows = await db.sequelize.query(
      `SELECT COUNT(*)::int AS cnt
       FROM book_interactions bi
       INNER JOIN books b ON b.id = bi.book_id
       WHERE bi.user_id = :userId
         AND b.club_id = :clubId
         AND bi.updated_at >= :since`,
      {
        replacements: {userId, clubId: parseInt(clubId, 10), since},
        type: QueryTypes.SELECT,
      },
  );
  const cnt = rows?.[0]?.cnt ?? 0;
  return parseInt(cnt, 10) > 0;
};

/**
 * @param {number} itemCount
 * @param {boolean} anyOneDay
 * @param {boolean} anyThreeDay
 * @return {{ title: string, body: string }}
 */
const buildDiscoveryNotificationCopy = (itemCount, anyOneDay, anyThreeDay) => {
  if (itemCount === 1) {
    if (anyOneDay) {
      return {
        title: "Meetings · Discover",
        body:
          "📖 Meeting tomorrow — go through discovery and like or pass " +
          "the books in your feed!",
      };
    }
    return {
      title: "Meetings · Discover",
      body:
        "📚 Meeting in 3 days — swipe discovery and like or pass books " +
        "so your club has a full queue to choose from!",
    };
  }
  return {
    title: "Meetings · Discover",
    body:
      `${itemCount} clubs have meetings soon — swipe discovery and like or pass ` +
      "books so the queues are ready!",
  };
};

exports.meetingDiscoveryReminder = onSchedule(
    {
      schedule: "0 * * * *",
      timeZone: "UTC",
      region: "us-central1",
      maxInstances: 1,
      memory: "512MiB",
      timeoutSeconds: 540,
    },
    async () => {
      console.log("Meeting discovery reminder function triggered");

      try {
        const now = new Date();
        const since = new Date(
            now.getTime() - INTERACTION_SKIP_DAYS * 24 * 3600 * 1000,
        );
        const windowEnd = new Date(now.getTime() + 5 * 24 * 3600 * 1000);
        const todayStr = now.toISOString().split("T")[0];
        const windowEndStr = windowEnd.toISOString().split("T")[0];

        const meetings = await db.Meeting.findAll({
          where: {
            date: {
              [Op.between]: [todayStr, windowEndStr],
            },
          },
        });

        console.log(`Found ${meetings.length} meeting(s) in discovery window`);

        const ownerTzCache = new Map();
        /** @type {Map<string, { user: object, items: Array<{ clubId: number, kind: string }> }>} */
        const pendingByUser = new Map();

        for (const meeting of meetings) {
          let fallbackTz = ownerTzCache.get(meeting.clubId);
          if (!fallbackTz) {
            fallbackTz = await getClubOwnerTimezone(meeting.clubId);
            ownerTzCache.set(meeting.clubId, fallbackTz);
          }

          const meetingTz = meeting.timezone || fallbackTz;
          const meetingDateStr = typeof meeting.date === "string" ?
            meeting.date :
            new Date(meeting.date).toISOString().split("T")[0];

          const date3 = getCalendarDateDaysBeforeMeeting(
              meetingDateStr,
              meetingTz,
              3,
          );
          const date1 = getCalendarDateDaysBeforeMeeting(
              meetingDateStr,
              meetingTz,
              1,
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

          for (const member of allMembers) {
            if (!member.user) continue;

            const m = member.user.notificationSettings?.meetings || {};
            if (!meetingsNotificationsEnabled(m)) continue;

            if (getUserLocalHour(member.user, now) !== DISCOVERY_HOUR) {
              continue;
            }

            const memberToday = getUserLocalDateString(member.user, now);
            let kind = null;
            if (memberToday === date3) {
              kind = "threeDay";
            } else if (
              memberToday === date1 &&
              meetingsOneDayBeforeEnabled(m)
            ) {
              kind = "oneDay";
            }
            if (!kind) continue;

            if (await hasRecentDiscoveryActivity(
                member.user.uid,
                meeting.clubId,
                since,
            )) {
              continue;
            }

            const uid = member.user.uid;
            if (!pendingByUser.has(uid)) {
              pendingByUser.set(uid, {user: member.user, items: []});
            }
            const entry = pendingByUser.get(uid);
            const duplicate = entry.items.some(
                (i) => i.clubId === meeting.clubId && i.kind === kind,
            );
            if (!duplicate) {
              entry.items.push({clubId: meeting.clubId, kind});
            }
          }
        }

        let notificationsSent = 0;

        for (const [uid, {items}] of pendingByUser) {
          if (items.length === 0) continue;

          const [webN, nativeN] = await Promise.all([
            db.PushSubscription.count({where: {userId: uid}}),
            db.NativePushToken.count({where: {userId: uid}}),
          ]);
          if (webN === 0 && nativeN === 0) {
            continue;
          }

          const anyOneDay = items.some((i) => i.kind === "oneDay");
          const anyThreeDay = items.some((i) => i.kind === "threeDay");
          const {title, body} = buildDiscoveryNotificationCopy(
              items.length,
              anyOneDay,
              anyThreeDay,
          );

          const clubId = items.length === 1 ? String(items[0].clubId) : undefined;
          const data = {
            route: "/books/discover",
            type: "discovery",
            ...(clubId ? {clubId} : {}),
          };

          const {web, native} = await sendNotificationsToUser(
              uid,
              title,
              body,
              data,
              {icon: DEFAULT_APP_ICON, badge: DEFAULT_APP_ICON},
          );
          notificationsSent +=
            web.filter((r) => r.success).length +
            native.filter((r) => r.success).length;

          console.log(
              `Sent discovery reminder to ${uid} (${items.length} club(s))`,
          );
        }

        console.log(
            `Meeting discovery reminder completed: ${notificationsSent} notification(s)`,
        );
      } catch (error) {
        console.error("Error in meeting discovery reminder:", error);
        throw error;
      }
    },
);
