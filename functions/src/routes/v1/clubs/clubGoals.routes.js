const express = require("express");
const {
  listClubGoals,
  getClubGoal,
  createClubGoal,
  updateClubGoal,
  deleteClubGoal,
} = require("./clubGoals.ctrl");

const router = express.Router({mergeParams: true});

router
    .get("/", listClubGoals)
    .post("/", createClubGoal)
    .get("/:clubGoalId", getClubGoal)
    .patch("/:clubGoalId", updateClubGoal)
    .delete("/:clubGoalId", deleteClubGoal);

module.exports = router;
