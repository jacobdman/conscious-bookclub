const express = require("express");
const {getReadStatus, markAsRead, getLinkPreview, getImageProxy} = require("./feed.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/read-status", getReadStatus)
    .post("/mark-read", markAsRead)
    .get("/link-preview", getLinkPreview)
    .get("/image-proxy", getImageProxy);

module.exports = router;

