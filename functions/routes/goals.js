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

// POST /v1/goals/:userId/:goalId/milestone/:milestoneIndex - Mark milestone complete (legacy)
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

// Entry routes
// POST /v1/goals/:userId/:goalId/entries - Create entry
router.post("/:userId/:goalId/entries", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    const entryData = req.body;
    const entry = await dbService.createGoalEntry(userId, parseInt(goalId), entryData);
    res.status(201).json(entry);
  } catch (error) {
    console.error("Error creating entry:", error);
    res.status(500).json({error: "Failed to create entry"});
  }
});

// GET /v1/goals/:userId/:goalId/entries - Get entries
router.get("/:userId/:goalId/entries", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    const {periodStart, periodEnd} = req.query;
    const entries = await dbService.getGoalEntries(
        userId,
        parseInt(goalId),
        periodStart ? new Date(periodStart) : null,
        periodEnd ? new Date(periodEnd) : null,
    );
    res.json(entries);
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({error: "Failed to fetch entries"});
  }
});

// PUT /v1/goals/:userId/:goalId/entries/:entryId - Update entry
router.put("/:userId/:goalId/entries/:entryId", async (req, res) => {
  try {
    const {userId, entryId} = req.params;
    const updates = req.body;
    const entry = await dbService.updateGoalEntry(userId, parseInt(entryId), updates);
    res.json(entry);
  } catch (error) {
    console.error("Error updating entry:", error);
    res.status(500).json({error: "Failed to update entry"});
  }
});

// DELETE /v1/goals/:userId/:goalId/entries/:entryId - Delete entry
router.delete("/:userId/:goalId/entries/:entryId", async (req, res) => {
  try {
    const {userId, entryId} = req.params;
    await dbService.deleteGoalEntry(userId, parseInt(entryId));
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting entry:", error);
    res.status(500).json({error: "Failed to delete entry"});
  }
});

// GET /v1/goals/:userId/:goalId/progress - Get current progress
router.get("/:userId/:goalId/progress", async (req, res) => {
  try {
    const {userId, goalId} = req.params;
    const progress = await dbService.getGoalProgress(userId, parseInt(goalId));
    res.json(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    res.status(500).json({error: "Failed to fetch progress"});
  }
});

// Milestone routes
// POST /v1/goals/:userId/:goalId/milestones - Create milestone
router.post("/:userId/:goalId/milestones", async (req, res) => {
  try {
    const {goalId} = req.params;
    const milestoneData = req.body;
    const milestone = await dbService.createMilestone(parseInt(goalId), milestoneData);
    res.status(201).json(milestone);
  } catch (error) {
    console.error("Error creating milestone:", error);
    res.status(500).json({error: "Failed to create milestone"});
  }
});

// PUT /v1/goals/:userId/:goalId/milestones/:milestoneId - Update milestone
router.put("/:userId/:goalId/milestones/:milestoneId", async (req, res) => {
  try {
    const {milestoneId} = req.params;
    const updates = req.body;
    const milestone = await dbService.updateMilestone(parseInt(milestoneId), updates);
    res.json(milestone);
  } catch (error) {
    console.error("Error updating milestone:", error);
    res.status(500).json({error: "Failed to update milestone"});
  }
});

module.exports = router;
