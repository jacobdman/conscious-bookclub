const db = require("../../../../db/models/index");

// TODO: Seriously refactor this controller (too much logic). Lots of endpoints should be combined.

// Helper function to get milestones for a goal
const getMilestones = async (goalId) => {
  const milestones = await db.Milestone.findAll({
    where: {goalId},
    order: [["id", "ASC"]],
  });
  return milestones.map((m) => ({id: m.id, ...m.toJSON()}));
};

// Helper function to get goal entries
const getGoalEntries = async (userId, goalId, periodStart, periodEnd) => {
  const whereClause = {
    goalId,
    userId,
  };

  if (periodStart && periodEnd) {
    whereClause.occurredAt = {
      [db.Op.gte]: periodStart,
      [db.Op.lt]: periodEnd,
    };
  }

  const entries = await db.GoalEntry.findAll({
    where: whereClause,
    order: [["occurred_at", "DESC"]],
  });
  return entries.map((entry) => ({id: entry.id, ...entry.toJSON()}));
};

// Helper function to get period boundaries
const getPeriodBoundaries = (
    cadence,
    timestamp = null,
) => {
  const now = timestamp || new Date();
  const utcNow = new Date(now.toISOString());

  let start; let end;

  switch (cadence) {
    case "day": {
      start = new Date(Date.UTC(
          utcNow.getUTCFullYear(),
          utcNow.getUTCMonth(),
          utcNow.getUTCDate(),
      ));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    }
    case "week": {
      // Week starts on Monday (ISO week)
      const dayOfWeek = utcNow.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(utcNow);
      monday.setUTCDate(utcNow.getUTCDate() - daysToMonday);
      start = new Date(Date.UTC(
          monday.getUTCFullYear(),
          monday.getUTCMonth(),
          monday.getUTCDate(),
      ));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      break;
    }
    case "month": {
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() + 1, 1));
      break;
    }
    case "quarter": {
      const quarter = Math.floor(utcNow.getUTCMonth() / 3);
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), quarter * 3, 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), (quarter + 1) * 3, 1));
      break;
    }
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }

  return {start, end};
};

// Helper function to evaluate goal
const evaluateGoal = async (userId, goalId, timestamp = null) => {
  const goal = await db.Goal.findOne({where: {id: goalId, userId}});
  if (!goal) {
    throw new Error("Goal not found");
  }

  const goalData = goal.toJSON();

  // For milestone and one-time goals, return their completion status
  if (goalData.type === "milestone") {
    const milestones = await getMilestones(goalId);
    const allDone = milestones.length > 0 && milestones.every((m) => m.done);
    return {
      completed: allDone,
      actual: milestones.filter((m) => m.done).length,
      target: milestones.length,
    };
  }

  if (goalData.type === "one_time") {
    return {
      completed: goalData.completed || false,
      actual: goalData.completed ? 1 : 0,
      target: 1,
    };
  }

  // For habit and metric goals, evaluate based on entries
  if (!goalData.cadence) {
    throw new Error("Goal must have cadence for evaluation");
  }

  const {start, end} = getPeriodBoundaries(goalData.cadence, timestamp);
  const entries = await getGoalEntries(userId, goalId, start, end);

  if (goalData.measure === "count") {
    const count = entries.length;
    return {
      completed: count >= goalData.targetCount,
      actual: count,
      target: goalData.targetCount,
    };
  } else if (goalData.measure === "sum") {
    const sum = entries.reduce((acc, entry) => {
      return acc + (parseFloat(entry.quantity) || 0);
    }, 0);
    return {
      completed: sum >= parseFloat(goalData.targetQuantity),
      actual: sum,
      target: parseFloat(goalData.targetQuantity),
      unit: goalData.unit,
    };
  }

  throw new Error(`Invalid measure: ${goalData.measure}`);
};

// GET /v1/goals/:userId - Get user's goals
const getGoals = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const goals = await db.Goal.findAll({
      where: {userId},
      order: [["created_at", "DESC"]],
      include: [
        {
          model: db.Milestone,
          as: "milestones",
          attributes: ["id", "title", "done", "doneAt"],
        },
      ],
    });
    const goalsData = goals.map((goal) => {
      const goalData = goal.toJSON();
      // Ensure milestones array exists (will be populated via alias)
      if (!goalData.milestones) {
        goalData.milestones = [];
      }
      return {id: goal.id, ...goalData};
    });
    res.json(goalsData);
  } catch (e) {
    next(e);
  }
};

// POST /v1/goals/:userId - Create new goal
const createGoal = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const goalData = req.body;

    // Validate goal type invariants
    const {type, measure, cadence, targetCount, targetQuantity, unit} = goalData;

    if (type === "habit") {
      if (measure !== "count") {
        throw new Error("Habit goals must have measure='count'");
      }
      if (!cadence) {
        throw new Error("Habit goals must have cadence");
      }
      if (!targetCount) {
        throw new Error("Habit goals must have target_count");
      }
    } else if (type === "metric") {
      if (measure !== "sum") {
        throw new Error("Metric goals must have measure='sum'");
      }
      if (!cadence) {
        throw new Error("Metric goals must have cadence");
      }
      if (!targetQuantity) {
        throw new Error("Metric goals must have target_quantity");
      }
      if (!unit) {
        throw new Error("Metric goals must have unit");
      }
    }

    const goal = await db.Goal.create({
      ...goalData,
      userId,
      createdAt: new Date(),
    });

    // Create milestones if provided
    if (type === "milestone" && goalData.milestones && Array.isArray(goalData.milestones)) {
      for (const milestoneData of goalData.milestones) {
        await db.Milestone.create({
          goalId: goal.id,
          title: milestoneData.title,
          done: milestoneData.done || false,
          doneAt: milestoneData.doneAt || null,
        });
      }
    }

    // Fetch the complete goal with milestones to return all fields
    const completeGoal = await db.Goal.findByPk(goal.id, {
      include: [
        {
          model: db.Milestone,
          as: "milestones",
          attributes: ["id", "title", "done", "doneAt"],
        },
      ],
    });

    res.status(201).json(completeGoal.toJSON());
  } catch (e) {
    next(e);
  }
};

// PUT /v1/goals/:userId/:goalId - Update goal
const updateGoal = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    const updates = req.body;

    // Remove milestones from updates if present (we'll handle them separately)
    const {milestones, ...goalUpdates} = updates;

    // Check if this is a milestone goal (either updating to milestone or already is one)
    const goal = await db.Goal.findOne({where: {id: goalId, userId}});
    if (!goal) {
      const error = new Error("Goal not found");
      error.status = 404;
      throw error;
    }

    const isMilestoneGoal = updates.type === "milestone" || goal.type === "milestone";

    // Update the goal itself
    await db.Goal.update(goalUpdates, {where: {id: goalId, userId}});

    // Handle milestones if provided and this is a milestone goal
    if (isMilestoneGoal && milestones && Array.isArray(milestones)) {
      // Delete existing milestones for this goal
      await db.Milestone.destroy({where: {goalId}});

      // Create new milestones
      for (const milestoneData of milestones) {
        await db.Milestone.create({
          goalId,
          title: milestoneData.title,
          done: milestoneData.done || false,
          doneAt: milestoneData.doneAt || null,
        });
      }
    }

    const updatedGoal = await db.Goal.findByPk(goalId, {
      include: [
        {
          model: db.Milestone,
          as: "milestones",
          attributes: ["id", "title", "done", "doneAt"],
        },
      ],
    });

    res.json({id: updatedGoal.id, ...updatedGoal.toJSON()});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/goals/:userId/:goalId - Delete goal
const deleteGoal = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    // Cascade delete will handle entries and milestones
    await db.Goal.destroy({where: {id: goalId, userId}});
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// POST /v1/goals/:userId/:goalId/complete - Mark goal as complete
const markGoalComplete = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    const {periodId} = req.body;

    if (periodId) {
      await db.GoalCompletion.upsert({
        userId,
        goalId: parseInt(goalId),
        periodId,
        completed: true,
        completedAt: new Date(),
      });
    } else {
      await db.Goal.update(
          {completed: true, completedAt: new Date()},
          {where: {id: goalId, userId}},
      );
    }

    res.json({success: true});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/goals/:userId/:goalId/complete - Mark goal as incomplete
const markGoalIncomplete = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    const {periodId} = req.body;

    if (periodId) {
      await db.GoalCompletion.destroy({
        where: {userId, goalId: parseInt(goalId), periodId},
      });
    }

    res.json({success: true});
  } catch (e) {
    next(e);
  }
};

// GET /v1/goals/:userId/:goalId/completion - Check goal completion
const checkGoalCompletion = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    const {periodId} = req.query;

    if (!periodId) {
      const error = new Error("periodId is required");
      error.status = 400;
      throw error;
    }

    const completion = await db.GoalCompletion.findOne({
      where: {userId, goalId: parseInt(goalId), periodId},
    });
    res.json({completed: !!completion});
  } catch (e) {
    next(e);
  }
};

// POST /v1/goals/:userId/:goalId/milestone/:milestoneIndex - Mark milestone complete (legacy)
const markMilestoneComplete = async (req, res, next) => {
  try {
    const {userId, goalId, milestoneIndex} = req.params;
    const goal = await db.Goal.findOne({where: {id: goalId, userId}});
    if (!goal) {
      const error = new Error("Goal not found");
      error.status = 404;
      throw error;
    }

    const milestones = await getMilestones(goalId);
    if (milestones[milestoneIndex]) {
      await db.Milestone.update(
          {done: true, doneAt: new Date()},
          {where: {id: milestones[milestoneIndex].id}},
      );
    }
    res.json({success: true});
  } catch (e) {
    next(e);
  }
};

// POST /v1/goals/:userId/:goalId/entries - Create entry
const createGoalEntry = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    const entryData = req.body;
    const entry = await db.GoalEntry.create({
      goalId: parseInt(goalId),
      userId,
      occurredAt: entryData.occurred_at || new Date(),
      quantity: entryData.quantity || null,
    });
    res.status(201).json({id: entry.id, ...entry.toJSON()});
  } catch (e) {
    next(e);
  }
};

// GET /v1/goals/:userId/:goalId/entries - Get entries
const getGoalEntriesHandler = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    const {periodStart, periodEnd} = req.query;
    const entries = await getGoalEntries(
        userId,
        parseInt(goalId),
        periodStart ? new Date(periodStart) : null,
        periodEnd ? new Date(periodEnd) : null,
    );
    res.json(entries);
  } catch (e) {
    next(e);
  }
};

// PUT /v1/goals/:userId/:goalId/entries/:entryId - Update entry
const updateGoalEntry = async (req, res, next) => {
  try {
    const {userId, entryId} = req.params;
    const updates = req.body;
    const entry = await db.GoalEntry.findOne({
      where: {id: parseInt(entryId), userId},
    });
    if (!entry) {
      const error = new Error("Entry not found");
      error.status = 404;
      throw error;
    }
    await entry.update({
      occurredAt: updates.occurred_at || entry.occurredAt,
      quantity: updates.quantity !== undefined ? updates.quantity : entry.quantity,
    });
    res.json({id: entry.id, ...entry.toJSON()});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/goals/:userId/:goalId/entries/:entryId - Delete entry
const deleteGoalEntry = async (req, res, next) => {
  try {
    const {userId, entryId} = req.params;
    await db.GoalEntry.destroy({where: {id: parseInt(entryId), userId}});
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// GET /v1/goals/:userId/:goalId/progress - Get current progress
const getGoalProgress = async (req, res, next) => {
  try {
    const {userId, goalId} = req.params;
    const progress = await evaluateGoal(userId, parseInt(goalId));
    res.json(progress);
  } catch (e) {
    next(e);
  }
};

// POST /v1/goals/:userId/:goalId/milestones - Create milestone
const createMilestone = async (req, res, next) => {
  try {
    const {goalId} = req.params;
    const milestoneData = req.body;
    const milestone = await db.Milestone.create({
      goalId: parseInt(goalId),
      title: milestoneData.title,
      done: milestoneData.done || false,
      doneAt: milestoneData.doneAt || null,
    });
    res.status(201).json({id: milestone.id, ...milestone.toJSON()});
  } catch (e) {
    next(e);
  }
};

// PUT /v1/goals/:userId/:goalId/milestones/:milestoneId - Update milestone
const updateMilestone = async (req, res, next) => {
  try {
    const {milestoneId} = req.params;
    const updates = req.body;
    const milestone = await db.Milestone.findByPk(parseInt(milestoneId));
    if (!milestone) {
      const error = new Error("Milestone not found");
      error.status = 404;
      throw error;
    }
    await milestone.update({
      title: updates.title || milestone.title,
      done: updates.done !== undefined ? updates.done : milestone.done,
      doneAt: updates.done ? (updates.doneAt || new Date()) : null,
    });
    res.json({id: milestone.id, ...milestone.toJSON()});
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  markGoalComplete,
  markGoalIncomplete,
  checkGoalCompletion,
  markMilestoneComplete,
  createGoalEntry,
  getGoalEntries: getGoalEntriesHandler,
  updateGoalEntry,
  deleteGoalEntry,
  getGoalProgress,
  createMilestone,
  updateMilestone,
};

