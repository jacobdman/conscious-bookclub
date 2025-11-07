const express = require("express");
const {getHealth} = require("./health.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router.get("/", getHealth);

module.exports = router;

