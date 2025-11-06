const express = require("express");
const {getMeetings} = require("./meetings.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getMeetings);

module.exports = router;

