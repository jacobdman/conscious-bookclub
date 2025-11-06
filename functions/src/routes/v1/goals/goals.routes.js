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
    .get("/:userId", getGoals)
    .post("/:userId", createGoal)
    .put("/:userId/:goalId", updateGoal)
    .delete("/:userId/:goalId", deleteGoal)
    .post("/:userId/:goalId/complete", markGoalComplete)
    .delete("/:userId/:goalId/complete", markGoalIncomplete)
    .get("/:userId/:goalId/completion", checkGoalCompletion)
    .post("/:userId/:goalId/milestone/:milestoneIndex", markMilestoneComplete)
    .post("/:userId/:goalId/entries", createGoalEntry)
    .get("/:userId/:goalId/entries", getGoalEntries)
    .put("/:userId/:goalId/entries/:entryId", updateGoalEntry)
    .delete("/:userId/:goalId/entries/:entryId", deleteGoalEntry)
    .get("/:userId/:goalId/progress", getGoalProgress)
    .post("/:userId/:goalId/milestones", createMilestone)
    .put("/:userId/:goalId/milestones/:milestoneId", updateMilestone);

module.exports = router;

