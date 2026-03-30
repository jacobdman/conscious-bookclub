const express = require("express");
const {
  getDiscoverQueue,
  getDiscoverStats,
  postDiscoverInteract,
  deleteDiscoverInteract,
} = require("./discover.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router.get("/queue", getDiscoverQueue);
router.get("/stats", getDiscoverStats);
router.post("/:id/interact", postDiscoverInteract);
router.delete("/:id/interact", deleteDiscoverInteract);

module.exports = router;
