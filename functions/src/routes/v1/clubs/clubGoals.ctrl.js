const db = require("../../../../db/models/index");
const {
  createMemberGoalFromClubGoal,
  archiveGoalsForClubGoal,
} = require("../../../services/clubs/clubGoalsMemberSync.service");

const assertMember = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId: parseInt(clubId, 10), userId},
  });
  if (!membership) {
    const err = new Error("Club not found or user is not a member");
    err.status = 404;
    throw err;
  }
  return membership;
};

const assertManage = async (clubId, userId) => {
  const membership = await assertMember(clubId, userId);
  if (!["owner", "admin"].includes(membership.role)) {
    const err = new Error("Only club owners or admins can manage club goals");
    err.status = 403;
    throw err;
  }
  return membership;
};

const validateClubGoalPayload = (body) => {
  const {
    type,
    measure,
    cadence,
    reportingPeriod,
    targetCount,
    targetQuantity,
    unit,
    contributionMode,
    progressDirection,
    aggregation,
    displayStyle,
  } = body;

  if (!type || !["habit", "metric", "milestone", "one_time"].includes(type)) {
    const err = new Error("Invalid goal type");
    err.status = 400;
    throw err;
  }

  if (type === "habit") {
    if (measure !== "count") {
      const err = new Error("Habit goals must have measure='count'");
      err.status = 400;
      throw err;
    }
    if (!cadence || !targetCount) {
      const err = new Error("Habit goals require cadence and target_count");
      err.status = 400;
      throw err;
    }
  } else if (type === "metric") {
    if (measure !== "sum") {
      const err = new Error("Metric goals must have measure='sum'");
      err.status = 400;
      throw err;
    }
    if (!cadence || !targetQuantity || !unit) {
      const err = new Error("Metric goals require cadence, target_quantity, and unit");
      err.status = 400;
      throw err;
    }
  } else if (type === "milestone") {
    if (
      !body.milestones ||
      !Array.isArray(body.milestones) ||
      body.milestones.length === 0
    ) {
      const err = new Error("Milestone club goals require milestones array");
      err.status = 400;
      throw err;
    }
  }

  if (contributionMode && !["shared_total", "individual_target"].includes(contributionMode)) {
    const err = new Error("Invalid contribution_mode");
    err.status = 400;
    throw err;
  }
  if (progressDirection && !["increase", "decrease", "stay_under"].includes(progressDirection)) {
    const err = new Error("Invalid progress_direction");
    err.status = 400;
    throw err;
  }
  if (aggregation && !["sum", "percent_completed", "average"].includes(aggregation)) {
    const err = new Error("Invalid aggregation");
    err.status = 400;
    throw err;
  }
  if (
    reportingPeriod != null &&
    reportingPeriod !== "" &&
    !["week", "month", "quarter"].includes(reportingPeriod)
  ) {
    const err = new Error("Invalid reporting_period (use week, month, quarter, or omit)");
    err.status = 400;
    throw err;
  }
  const displayStyles = ["standard", "remaining_budget", "leaderboard", "streak"];
  if (displayStyle && !displayStyles.includes(displayStyle)) {
    const err = new Error("Invalid display_style");
    err.status = 400;
    throw err;
  }
};

const buildMilestoneTemplate = (milestones) => {
  if (!milestones || !Array.isArray(milestones)) return null;
  return milestones.map((m, i) => ({
    title: m.title,
    order: m.order !== undefined ? m.order : i,
  }));
};

// GET /v1/clubs/:clubId/club-goals?userId=
const listClubGoals = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    if (!userId) {
      const err = new Error("userId is required");
      err.status = 400;
      throw err;
    }

    await assertMember(clubId, userId);

    const rows = await db.ClubGoal.findAll({
      where: {clubId: parseInt(clubId, 10), archived: false},
      order: [["created_at", "DESC"]],
    });

    const withCounts = await Promise.all(
        rows.map(async (cg) => {
          const memberCount = await db.Goal.count({
            where: {clubGoalId: cg.id, archived: false},
          });
          const json = cg.toJSON();
          return {...json, memberGoalCount: memberCount};
        }),
    );

    res.json(withCounts);
  } catch (e) {
    next(e);
  }
};

// GET /v1/clubs/:clubId/club-goals/:clubGoalId?userId=
const getClubGoal = async (req, res, next) => {
  try {
    const {clubId, clubGoalId} = req.params;
    const userId = req.query.userId;
    if (!userId) {
      const err = new Error("userId is required");
      err.status = 400;
      throw err;
    }

    await assertMember(clubId, userId);

    const cg = await db.ClubGoal.findOne({
      where: {id: parseInt(clubGoalId, 10), clubId: parseInt(clubId, 10)},
    });
    if (!cg) {
      const err = new Error("Club goal not found");
      err.status = 404;
      throw err;
    }

    const memberGoalCount = await db.Goal.count({
      where: {clubGoalId: cg.id, archived: false},
    });

    res.json({...cg.toJSON(), memberGoalCount});
  } catch (e) {
    next(e);
  }
};

// POST /v1/clubs/:clubId/club-goals?userId=
const createClubGoal = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;
    if (!userId) {
      const err = new Error("userId is required");
      err.status = 400;
      throw err;
    }

    await assertManage(clubId, userId);

    const body = req.body || {};
    validateClubGoalPayload(body);

    const title = (body.title || "").trim();
    if (!title) {
      const err = new Error("title is required");
      err.status = 400;
      throw err;
    }

    const milestoneTemplate =
      body.type === "milestone" ? buildMilestoneTemplate(body.milestones) : null;

    const reportingPeriodVal =
      body.reportingPeriod && ["week", "month", "quarter"].includes(body.reportingPeriod) ?
        body.reportingPeriod :
        null;

    const clubGoal = await db.ClubGoal.create({
      clubId: parseInt(clubId, 10),
      createdBy: userId,
      title,
      type: body.type,
      contributionMode: body.contributionMode || "shared_total",
      progressDirection: body.progressDirection || "increase",
      aggregation: body.aggregation || "sum",
      displayStyle: body.displayStyle || "standard",
      measure: body.measure || null,
      cadence: body.cadence || null,
      reportingPeriod: reportingPeriodVal,
      targetCount: body.targetCount || null,
      targetQuantity: body.targetQuantity || null,
      unit: body.unit || null,
      dueAt: body.dueAt ? new Date(body.dueAt) : null,
      milestoneTemplate,
      archived: false,
    });

    const members = await db.ClubMember.findAll({
      where: {clubId: parseInt(clubId, 10)},
    });

    for (const m of members) {
      await createMemberGoalFromClubGoal(clubGoal, m.userId);
    }

    const memberGoalCount = await db.Goal.count({
      where: {clubGoalId: clubGoal.id, archived: false},
    });

    res.status(201).json({...clubGoal.toJSON(), memberGoalCount});
  } catch (e) {
    next(e);
  }
};

// PATCH /v1/clubs/:clubId/club-goals/:clubGoalId?userId=
const updateClubGoal = async (req, res, next) => {
  try {
    const {clubId, clubGoalId} = req.params;
    const userId = req.query.userId;
    if (!userId) {
      const err = new Error("userId is required");
      err.status = 400;
      throw err;
    }

    await assertManage(clubId, userId);

    const cg = await db.ClubGoal.findOne({
      where: {id: parseInt(clubGoalId, 10), clubId: parseInt(clubId, 10)},
    });
    if (!cg) {
      const err = new Error("Club goal not found");
      err.status = 404;
      throw err;
    }

    const body = req.body || {};

    const updates = {
      title: body.title !== undefined ? String(body.title).trim() : cg.title,
      contributionMode:
        body.contributionMode !== undefined ? body.contributionMode : cg.contributionMode,
      progressDirection:
        body.progressDirection !== undefined ? body.progressDirection : cg.progressDirection,
      aggregation: body.aggregation !== undefined ? body.aggregation : cg.aggregation,
      displayStyle: body.displayStyle !== undefined ? body.displayStyle : cg.displayStyle,
      measure: body.measure !== undefined ? body.measure : cg.measure,
      cadence: body.cadence !== undefined ? body.cadence : cg.cadence,
      reportingPeriod:
        body.reportingPeriod !== undefined ?
          body.reportingPeriod && ["week", "month", "quarter"].includes(body.reportingPeriod) ?
            body.reportingPeriod :
            null :
          cg.reportingPeriod,
      targetCount: body.targetCount !== undefined ? body.targetCount : cg.targetCount,
      targetQuantity: body.targetQuantity !== undefined ? body.targetQuantity : cg.targetQuantity,
      unit: body.unit !== undefined ? body.unit : cg.unit,
      dueAt: body.dueAt !== undefined ? (body.dueAt ? new Date(body.dueAt) : null) : cg.dueAt,
    };

    if (body.title !== undefined && !updates.title) {
      const err = new Error("title cannot be empty");
      err.status = 400;
      throw err;
    }

    if (body.type !== undefined && body.type !== cg.type) {
      const err = new Error("Cannot change club goal type");
      err.status = 400;
      throw err;
    }

    if (body.milestones && cg.type === "milestone") {
      if (!Array.isArray(body.milestones) || body.milestones.length === 0) {
        const err = new Error("milestones must be a non-empty array");
        err.status = 400;
        throw err;
      }
      updates.milestoneTemplate = buildMilestoneTemplate(body.milestones);
    }

    const contribModes = ["shared_total", "individual_target"];
    if (body.contributionMode && !contribModes.includes(body.contributionMode)) {
      const err = new Error("Invalid contribution_mode");
      err.status = 400;
      throw err;
    }
    const progressDirs = ["increase", "decrease", "stay_under"];
    if (body.progressDirection && !progressDirs.includes(body.progressDirection)) {
      const err = new Error("Invalid progress_direction");
      err.status = 400;
      throw err;
    }
    if (
      body.reportingPeriod !== undefined &&
      body.reportingPeriod !== null &&
      body.reportingPeriod !== "" &&
      !["week", "month", "quarter"].includes(body.reportingPeriod)
    ) {
      const err = new Error("Invalid reporting_period");
      err.status = 400;
      throw err;
    }

    await cg.update(updates);

    const memberGoalFields = {
      title: updates.title,
      measure: updates.measure,
      cadence: updates.cadence,
      targetCount: updates.targetCount,
      targetQuantity: updates.targetQuantity,
      unit: updates.unit,
      dueAt: updates.dueAt,
      progressDirection: updates.progressDirection,
    };

    await db.Goal.update(memberGoalFields, {
      where: {clubGoalId: cg.id, clubId: parseInt(clubId, 10)},
    });

    const memberGoalCount = await db.Goal.count({
      where: {clubGoalId: cg.id, archived: false},
    });

    res.json({...cg.toJSON(), memberGoalCount});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/clubs/:clubId/club-goals/:clubGoalId?userId=
const deleteClubGoal = async (req, res, next) => {
  try {
    const {clubId, clubGoalId} = req.params;
    const userId = req.query.userId;
    if (!userId) {
      const err = new Error("userId is required");
      err.status = 400;
      throw err;
    }

    await assertManage(clubId, userId);

    const cg = await db.ClubGoal.findOne({
      where: {id: parseInt(clubGoalId, 10), clubId: parseInt(clubId, 10)},
    });
    if (!cg) {
      const err = new Error("Club goal not found");
      err.status = 404;
      throw err;
    }

    await cg.update({archived: true});
    await archiveGoalsForClubGoal(cg.id, clubId);

    res.json({ok: true});
  } catch (e) {
    next(e);
  }
};

module.exports = {
  listClubGoals,
  getClubGoal,
  createClubGoal,
  updateClubGoal,
  deleteClubGoal,
};
