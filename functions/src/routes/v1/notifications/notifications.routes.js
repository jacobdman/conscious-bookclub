const express = require("express");
const {
  subscribe,
  unsubscribe,
  getSubscription,
  subscribeNative,
  getNativeSubscription,
  sendTestNotification,
} = require("./notifications.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .post("/subscribe", subscribe)
    .post("/subscribe-native", subscribeNative)
    .delete("/unsubscribe", unsubscribe)
    .get("/subscription", getSubscription)
    .get("/subscription-native", getNativeSubscription)
    .post("/test", sendTestNotification);

module.exports = router;

