const express = require("express");
const {
  getUsers,
  getUser,
  createUser,
  updateNotificationPreferences,
  updateProfile,
} = require("./users.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getUsers)
    .get("/:userId", getUser)
    .post("/", createUser)
    .patch("/:userId/notification-preferences", updateNotificationPreferences)
    .patch("/:userId/profile", updateProfile);

module.exports = router;

