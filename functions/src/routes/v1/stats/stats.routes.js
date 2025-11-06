const express = require("express");
const {getHealth, getUserStats, getBookStats, getLeaderboard} = require("./stats.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/health", getHealth)
    .get("/users/:userId", getUserStats)
    .get("/books/:bookId", getBookStats)
    .get("/leaderboard", getLeaderboard);

module.exports = router;

