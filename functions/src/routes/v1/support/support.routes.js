const express = require("express");
const supportCtrl = require("./support.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router.post("/request-club", supportCtrl.requestClubCreation);

module.exports = router;

