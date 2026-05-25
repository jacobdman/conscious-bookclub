const db = require("../../db/models/index");
const {sendNotificationsToUser} = require("./pushSender");
const {feedNotificationsEnabled} = require("./defaultNotificationSettings");

const FEED_NOTIFICATION_ICON =
  "https://firebasestorage.googleapis.com/v0/b/conscious-bookclub-87073-9eb71" +
  ".firebasestorage.app/o/app-icons%2Ffeed-notification-icon.jpg?alt=media" +
  "&token=72c28a9a-88c5-485b-a9c9-74f349fc0f99";

/**
 * @param {string} actorUserId
 * @return {Promise<string>}
 */
const resolveActorDisplayName = async (actorUserId) => {
  const actor = await db.User.findByPk(actorUserId, {attributes: ["displayName"]});
  return actor?.displayName || "Someone";
};

/**
 * @param {object} params
 * @param {object} params.book Book row
 * @param {number|string} params.clubId
 * @param {string} params.actorUserId
 * @return {Promise<void>}
 */
const maybeNotifyUploader = async ({book, clubId, actorUserId}) => {
  if (!book?.uploadedBy || actorUserId === book.uploadedBy) {
    return;
  }

  const [webN, nativeN] = await Promise.all([
    db.PushSubscription.count({where: {userId: book.uploadedBy}}),
    db.NativePushToken.count({where: {userId: book.uploadedBy}}),
  ]);
  if (webN === 0 && nativeN === 0) {
    return;
  }

  const uploader = await db.User.findByPk(book.uploadedBy);
  if (!uploader) return;

  const feedSettings = uploader.notificationSettings?.feed || {};
  if (!feedNotificationsEnabled(feedSettings)) {
    return;
  }

  return {uploader, webN, nativeN};
};

/**
 * @param {object} params
 * @param {object} params.book
 * @param {number|string} params.clubId
 * @param {string} params.actorUserId
 * @param {string} [params.actorDisplayName]
 */
const notifyBookPromotedToBacklog = async ({
  book,
  clubId,
  actorUserId,
  actorDisplayName,
}) => {
  try {
    const gate = await maybeNotifyUploader({book, clubId, actorUserId});
    if (!gate) return;

    const title = "Discover · Backlog";
    const body = `🎉 "${book.title}" made it to your club's backlog!`;

    await sendNotificationsToUser(
        book.uploadedBy,
        title,
        body,
        {
          route: "/books/discover",
          type: "discovery",
          clubId: String(clubId),
          bookId: String(book.id),
        },
        {icon: FEED_NOTIFICATION_ICON, badge: FEED_NOTIFICATION_ICON},
    );
  } catch (err) {
    console.error("notifyBookPromotedToBacklog failed:", err);
  }
};

/**
 * @param {object} params
 * @param {object} params.book
 * @param {number|string} params.clubId
 * @param {string} params.actorUserId
 * @param {string} [params.actorDisplayName]
 */
const notifyBookSuperLiked = async ({
  book,
  clubId,
  actorUserId,
  actorDisplayName,
}) => {
  try {
    const gate = await maybeNotifyUploader({book, clubId, actorUserId});
    if (!gate) return;

    const name = actorDisplayName ||
      await resolveActorDisplayName(actorUserId);
    const title = "Discover · Super like";
    const body =
      `⭐ ${name} super-liked "${book.title}" — it's on the backlog now!`;

    await sendNotificationsToUser(
        book.uploadedBy,
        title,
        body,
        {
          route: "/books/discover",
          type: "discovery",
          clubId: String(clubId),
          bookId: String(book.id),
        },
        {icon: FEED_NOTIFICATION_ICON, badge: FEED_NOTIFICATION_ICON},
    );
  } catch (err) {
    console.error("notifyBookSuperLiked failed:", err);
  }
};

module.exports = {
  notifyBookPromotedToBacklog,
  notifyBookSuperLiked,
};
