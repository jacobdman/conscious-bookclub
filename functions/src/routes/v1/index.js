const express = require("express");
const books = require("./books");
const goals = require("./goals");
const posts = require("./posts");
const users = require("./users");
const progress = require("./progress");
const stats = require("./stats");
const meetings = require("./meetings");

const router = express.Router(); // eslint-disable-line new-cap

router.use("/books", books);
router.use("/goals", goals);
router.use("/posts", posts);
router.use("/users", users);
router.use("/progress", progress);
router.use("/stats", stats);
router.use("/meetings", meetings);

module.exports = router;

