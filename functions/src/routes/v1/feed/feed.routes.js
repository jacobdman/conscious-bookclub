const express = require("express");
const {getReadStatus, markAsRead} = require("./feed.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/read-status", getReadStatus)
    .post("/mark-read", markAsRead);

module.exports = router;

