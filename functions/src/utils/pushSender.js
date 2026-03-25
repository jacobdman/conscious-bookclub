/**
 * Unified push delivery: web (VAPID / PushSubscription) and native (FCM via NativePushToken).
 * Temporary title prefixes [PWA] / [Native] for debugging; remove when no longer needed.
 */
const db = require("../../db/models/index");
const webpush = require("web-push");
const {getMessaging} = require("firebase-admin/messaging");

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || "mailto:admin@consciousbookclub.com";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
}

const DEFAULT_APP_ICON = "/android-chrome-192x192.png";

/**
 * FCM data values must be strings.
 * @param {object} data Raw data object.
 * @return {object} String-valued copy for FCM data payload.
 */
const stringifyDataPayload = (data) => {
  if (!data || typeof data !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = v == null ? "" : String(v);
  }
  return out;
};

const hasVapidConfigured = () => !!(vapidPublicKey && vapidPrivateKey);

/**
 * Send one web push (VAPID).
 * @param {object|string} subscription PushSubscription JSON.
 * @param {string} title Notification title.
 * @param {string} body Notification body.
 * @param {object} data Optional payload data.
 * @param {object} options icon and badge URLs.
 * @return {Promise<object>} Result with success flag.
 */
const sendWebPush = async (subscription, title, body, data = {}, options = {}) => {
  if (!hasVapidConfigured()) {
    return {success: false, error: "VAPID keys not configured", skipped: true};
  }
  try {
    const subscriptionObj = typeof subscription === "string" ?
      JSON.parse(subscription) :
      subscription;

    const icon = options.icon != null ? options.icon : DEFAULT_APP_ICON;
    const badge = options.badge != null ? options.badge : DEFAULT_APP_ICON;

    const payload = JSON.stringify({
      title,
      body,
      icon,
      badge,
      data: data || {},
    });

    console.log("Sending web push:", {
      endpoint: subscriptionObj.endpoint ?
        subscriptionObj.endpoint.substring(0, 50) + "..." :
        "missing",
    });

    const result = await webpush.sendNotification(subscriptionObj, payload);
    return {success: true, statusCode: result.statusCode};
  } catch (error) {
    console.error("Error sending web push:", {
      message: error.message,
      statusCode: error.statusCode,
    });

    if (error.statusCode === 410 || error.statusCode === 404) {
      const subscriptionObj = typeof subscription === "string" ?
        JSON.parse(subscription) :
        subscription;
      await db.PushSubscription.destroy({
        where: {subscriptionJson: subscriptionObj},
      });
      console.log("Deleted invalid PushSubscription");
    }
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
    };
  }
};

/**
 * Send one FCM message to a native device token row.
 * @param {object} nativeRow NativePushToken Sequelize row (id, token, platform).
 * @param {string} title Notification title.
 * @param {string} body Notification body.
 * @param {object} data Optional data map (stringified for FCM).
 * @return {Promise<object>} Result with success flag.
 */
const sendNativePush = async (nativeRow, title, body, data = {}) => {
  const messaging = getMessaging();
  const dataPayload = stringifyDataPayload(data);

  try {
    const message = {
      token: nativeRow.token,
      notification: {title, body},
      data: dataPayload,
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
      android: {
        notification: {
          sound: "default",
        },
      },
    };

    const messageId = await messaging.send(message);
    console.log("Native push sent:", {platform: nativeRow.platform, messageId});
    return {success: true, messageId};
  } catch (error) {
    const code = error.code || error.errorInfo?.code;
    console.error("Error sending native push:", {
      message: error.message,
      code,
      platform: nativeRow.platform,
    });

    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      await db.NativePushToken.destroy({where: {id: nativeRow.id}});
      console.log("Deleted invalid NativePushToken id=", nativeRow.id);
    }

    return {
      success: false,
      error: error.message,
      code,
    };
  }
};

/**
 * Send to all web subscriptions and native tokens for a user.
 * @param {string} userId Firebase user uid.
 * @param {string} title Base title; [PWA]/[Native] tags applied per channel.
 * @param {string} body Notification body.
 * @param {object} data Optional payload.
 * @param {object} options icon and badge URLs for web push.
 * @return {Promise<object>} Object with web and native result arrays.
 */
const sendNotificationsToUser = async (userId, title, body, data = {}, options = {}) => {
  const icon = options.icon != null ? options.icon : DEFAULT_APP_ICON;
  const badge = options.badge != null ? options.badge : icon;

  const webTitle = `[PWA] ${title}`;
  const nativeTitle = `[Native] ${title}`;

  const webResults = [];
  const subscriptions = await db.PushSubscription.findAll({where: {userId}});
  for (const sub of subscriptions) {
    const result = await sendWebPush(
        sub.subscriptionJson,
        webTitle,
        body,
        data,
        {icon, badge},
    );
    webResults.push({subscriptionId: sub.id, ...result});
  }

  const nativeResults = [];
  const nativeTokens = await db.NativePushToken.findAll({where: {userId}});
  for (const nt of nativeTokens) {
    const result = await sendNativePush(nt, nativeTitle, body, data);
    nativeResults.push({
      nativeTokenId: nt.id,
      platform: nt.platform,
      ...result,
    });
  }

  return {web: webResults, native: nativeResults};
};

module.exports = {
  sendWebPush,
  sendNativePush,
  sendNotificationsToUser,
  hasVapidConfigured,
  DEFAULT_APP_ICON,
};
