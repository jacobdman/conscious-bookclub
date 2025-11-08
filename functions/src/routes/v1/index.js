const express = require("express");
const books = require("./books");
const goals = require("./goals");
const posts = require("./posts");
const users = require("./users");
const progress = require("./progress");
const meetings = require("./meetings");
const clubs = require("./clubs");
const health = require("./health");
const notifications = require("./notifications");

const router = express.Router(); // eslint-disable-line new-cap

router.use("/books", books);
router.use("/goals", goals);
router.use("/posts", posts);
router.use("/users", users);
router.use("/progress", progress);
router.use("/meetings", meetings);
router.use("/clubs", clubs);
router.use("/health", health);
router.use("/notifications", notifications);

module.exports = router;

