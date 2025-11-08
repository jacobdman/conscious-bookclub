const express = require("express");
const {
  subscribe,
  unsubscribe,
  getSubscription,
  sendTestNotification,
} = require("./notifications.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .post("/subscribe", subscribe)
    .delete("/unsubscribe", unsubscribe)
    .get("/subscription", getSubscription)
    .post("/test", sendTestNotification);

module.exports = router;

