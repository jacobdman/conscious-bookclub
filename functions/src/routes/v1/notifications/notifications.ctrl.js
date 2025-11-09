const db = require("../../../../db/models/index");
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

// POST /v1/notifications/subscribe - Register push subscription for user
const subscribe = async (req, res, next) => {
  try {
    const {userId} = req.query;
    const {subscription} = req.body;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!subscription) {
      const error = new Error("subscription is required");
      error.status = 400;
      throw error;
    }

    // Check if subscription already exists for this user
    const existing = await db.PushSubscription.findOne({
      where: {
        userId,
        subscriptionJson: subscription,
      },
    });

    if (existing) {
      return res.json({id: existing.id, ...existing.toJSON()});
    }

    // Create new subscription
    const pushSubscription = await db.PushSubscription.create({
      userId,
      subscriptionJson: subscription,
    });

    res.status(201).json({id: pushSubscription.id, ...pushSubscription.toJSON()});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/notifications/unsubscribe - Remove push subscription
const unsubscribe = async (req, res, next) => {
  try {
    const {userId} = req.query;
    const {subscription} = req.body;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    if (!subscription) {
      const error = new Error("subscription is required");
      error.status = 400;
      throw error;
    }

    await db.PushSubscription.destroy({
      where: {
        userId,
        subscriptionJson: subscription,
      },
    });

    res.status(204).send();
  } catch (e) {
    next(e);
  }
};

// GET /v1/notifications/subscription - Get user's current subscription status
const getSubscription = async (req, res, next) => {
  try {
    const {userId} = req.query;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const subscriptions = await db.PushSubscription.findAll({
      where: {userId},
    });

    res.json(subscriptions.map((sub) => ({id: sub.id, ...sub.toJSON()})));
  } catch (e) {
    next(e);
  }
};

// POST /v1/notifications/test - Send a test push notification to user
const sendTestNotification = async (req, res, next) => {
  try {
    const {userId} = req.query;
    const {title, body} = req.body;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Check if VAPID keys are configured
    if (!vapidPublicKey || !vapidPrivateKey) {
      const error = new Error("VAPID keys not configured");
      error.status = 500;
      throw error;
    }

    // Get user's push subscriptions
    const subscriptions = await db.PushSubscription.findAll({
      where: {userId},
    });

    if (subscriptions.length === 0) {
      return res.status(404).json({
        error: "No push subscriptions found for this user",
      });
    }

    // Send notification to all subscriptions
    const notificationTitle = title || "Test Notification";
    const notificationBody = body || "This is a test push notification from Conscious Book Club";

    const results = [];
    for (const subscription of subscriptions) {
      const result = await sendPushNotification(
          subscription.subscriptionJson,
          notificationTitle,
          notificationBody,
      );
      results.push({
        subscriptionId: subscription.id,
        ...result,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    res.json({
      message: `Sent ${successCount} notification(s), ${failureCount} failed`,
      total: subscriptions.length,
      successful: successCount,
      failed: failureCount,
      results,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  subscribe,
  unsubscribe,
  getSubscription,
  sendTestNotification,
};

