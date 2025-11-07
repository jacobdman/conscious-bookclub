const express = require("express");
const {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  markGoalComplete,
  markGoalIncomplete,
  checkGoalCompletion,
  markMilestoneComplete,
  createGoalEntry,
  getGoalEntries,
  updateGoalEntry,
  deleteGoalEntry,
  getGoalProgress,
  createMilestone,
  updateMilestone,
} = require("./goals.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getGoals)
    .post("/", createGoal)
    .patch("/:goalId", updateGoal)
    .delete("/:goalId", deleteGoal)
    .post("/:goalId/complete", markGoalComplete)
    .delete("/:goalId/complete", markGoalIncomplete)
    .get("/:goalId/completion", checkGoalCompletion)
    .post("/:goalId/milestone/:milestoneIndex", markMilestoneComplete)
    .post("/:goalId/entries", createGoalEntry)
    .get("/:goalId/entries", getGoalEntries)
    .put("/:goalId/entries/:entryId", updateGoalEntry)
    .delete("/:goalId/entries/:entryId", deleteGoalEntry)
    .get("/:goalId/progress", getGoalProgress)
    .post("/:goalId/milestones", createMilestone)
    .put("/:goalId/milestones/:milestoneId", updateMilestone);

module.exports = router;

