const db = require("../../../../db/models/index");

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

module.exports = {
  subscribe,
  unsubscribe,
  getSubscription,
};

