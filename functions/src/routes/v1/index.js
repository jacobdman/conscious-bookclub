const express = require("express");
const books = require("./books");
const goals = require("./goals");
const posts = require("./posts");
const users = require("./users");
const progress = require("./progress");
const meetings = require("./meetings");
const health = require("./health");

const router = express.Router(); // eslint-disable-line new-cap

router.use("/books", books);
router.use("/goals", goals);
router.use("/posts", posts);
router.use("/users", users);
router.use("/progress", progress);
router.use("/meetings", meetings);
router.use("/health", health);

module.exports = router;

