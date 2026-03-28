const express = require("express");
const {
  getUsers,
  getUser,
  createUser,
  updateNotificationPreferences,
  updateProfile,
  setVacationMode,
} = require("./users.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getUsers)
    .get("/:userId", getUser)
    .post("/", createUser)
    .patch("/:userId/notification-preferences", updateNotificationPreferences)
    .patch("/:userId/profile", updateProfile)
    .post("/:userId/vacation-mode", setVacationMode);

module.exports = router;

