const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const dbService = require("../services/databaseService");

// GET /v1/goals/:userId - Get user's goals
router.get("/:userId", async (req, res) => {
  try {
    const {userId} = req.params;
    const goals = await dbService.getGoals(userId);
    const goalsData = goals.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.json(goalsData);
  } catch (error) {
    console.error("Error fetching goals:", error);
    res.status(500).json({error: "Failed to fetch goals"});
  }
});

// POST /v1/goals/:userId - Create new goal
router.post("/:userId", async (req, res) => {
  try {
    const {userId} = req.params;
    const goalData = req.body;
    const result = await dbService.addGoal(userId, goalData);
    res.status(201).json({id: result.id, ...goalData});
  } catch (error) {
    console.error("Error creating goal:", error);
    res.status(500).json({error: "Failed to create goal"});
  }
});

// PUT /v1/goals/:userId/:goalId - Update goal
router.put("/:userId/:goalId", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    const updates = req.body;

    await dbService.updateGoal(userId, goalId, updates);
    res.json({id: goalId, ...updates});
  } catch (error) {
    console.error("Error updating goal:", error);
    res.status(500).json({error: "Failed to update goal"});
  }
});

// DELETE /v1/goals/:userId/:goalId - Delete goal
router.delete("/:userId/:goalId", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    await dbService.deleteGoal(userId, goalId);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting goal:", error);
    res.status(500).json({error: "Failed to delete goal"});
  }
});

// POST /v1/goals/:userId/:goalId/complete - Mark goal as complete
router.post("/:userId/:goalId/complete", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    const {periodId} = req.body;

    if (periodId) {
      await dbService.markGoalComplete(userId, goalId, periodId);
    } else {
      await dbService.markOneTimeGoalComplete(userId, goalId);
    }

    res.json({success: true});
  } catch (error) {
    console.error("Error completing goal:", error);
    res.status(500).json({error: "Failed to complete goal"});
  }
});

// DELETE /v1/goals/:userId/:goalId/complete - Mark goal as incomplete
router.delete("/:userId/:goalId/complete", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    const {periodId} = req.body;

    if (periodId) {
      await dbService.markGoalIncomplete(userId, goalId, periodId);
    }

    res.json({success: true});
  } catch (error) {
    console.error("Error marking goal incomplete:", error);
    res.status(500).json({error: "Failed to mark goal incomplete"});
  }
});

// GET /v1/goals/:userId/:goalId/completion - Check goal completion
router.get("/:userId/:goalId/completion", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    const {periodId} = req.query;

    if (!periodId) {
      return res.status(400).json({error: "periodId is required"});
    }

    const isComplete = await dbService.checkGoalCompletion(userId, goalId, periodId);
    res.json({completed: isComplete});
  } catch (error) {
    console.error("Error checking goal completion:", error);
    res.status(500).json({error: "Failed to check goal completion"});
  }
});

// POST /v1/goals/:userId/:goalId/milestone/:milestoneIndex - Mark milestone complete
router.post("/:userId/:goalId/milestone/:milestoneIndex", async (req, res) => {
  try {
    const {userId, goalId, milestoneIndex} = req.params;
    await dbService.markMilestoneComplete(userId, goalId, parseInt(milestoneIndex));
    res.json({success: true});
  } catch (error) {
    console.error("Error completing milestone:", error);
    res.status(500).json({error: "Failed to complete milestone"});
  }
});

module.exports = router;
