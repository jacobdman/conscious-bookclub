const db = require("../../../../db/models/index");

// Helper to emit Socket.io events via Cloud Run service
const emitToClub = async (clubId, event, data) => {
  try {
    // Determine Socket.io service URL
    // In production: use Cloud Run service URL
    // In local dev: use localhost
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
                       process.env.GCLOUD_PROJECT === "demo-test" ||
                       !process.env.GCLOUD_PROJECT;

    const socketServiceUrl = isEmulator ?
      "http://localhost:3001" : // Local development
      process.env.SOCKET_SERVICE_URL || "https://socket-service-x3bxvqpcca-uc.a.run.app"; // Production

    const room = `club:${clubId}`;

    // Make HTTP POST to Socket.io service /emit endpoint
    const response = await fetch(`${socketServiceUrl}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        room,
        event,
        data,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to emit ${event} to ${room}:`, response.status, response.statusText);
    }
  } catch (error) {
    // Don't throw - Socket.io events are best-effort, don't break the API response
    console.log("Socket.io emit failed (non-critical):", error.message);
  }
};

// GET /v1/posts - Get posts with pagination
const getPosts = async (req, res, next) => {
  try {
    const {clubId, limit, beforeId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    // Default to 25 posts, max 100
    const limitNum = limit ? Math.min(parseInt(limit, 10), 100) : 25;

    const whereClause = {clubId: parseInt(clubId)};

    // If beforeId is provided, only get posts older than that post
    if (beforeId) {
      const beforePost = await db.Post.findByPk(parseInt(beforeId));
      if (beforePost) {
        whereClause.created_at = {
          [db.Op.lt]: beforePost.created_at,
        };
      }
    }

    const posts = await db.Post.findAll({
      where: whereClause,
      order: [["created_at", "DESC"]],
      limit: limitNum + 1, // Fetch one extra to check if there are more
      include: [
        {model: db.User, as: "author", attributes: ["uid", "displayName", "photoUrl"]},
        {
          model: db.PostReaction,
          as: "reactions",
          include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
        },
      ],
    });

    // Check if there are more posts
    const hasMore = posts.length > limitNum;
    const postsToReturn = hasMore ? posts.slice(0, limitNum) : posts;

    res.json({
      posts: postsToReturn.map((post) => ({id: post.id, ...post.toJSON()})),
      hasMore,
      // Return the oldest post's ID for next pagination
      nextBeforeId: hasMore ? postsToReturn[postsToReturn.length - 1].id : null,
    });
  } catch (e) {
    next(e);
  }
};

// GET /v1/posts/:postId - Get single post
const getPost = async (req, res, next) => {
  try {
    const {postId} = req.params;
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
      include: [
        {model: db.User, as: "author", attributes: ["uid", "displayName", "photoUrl"]},
        {
          model: db.PostReaction,
          as: "reactions",
          include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
        },
      ],
    });
    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }
    res.json({id: post.id, ...post.toJSON()});
  } catch (e) {
    next(e);
  }
};

// POST /v1/posts - Create new post
const createPost = async (req, res, next) => {
  try {
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const postData = req.body;
    const clubIdInt = parseInt(clubId);

    // If this is a reply, fetch parent post text and author name
    let parentPostText = null;
    let parentAuthorName = null;
    if (postData.parentPostId) {
      const parentPost = await db.Post.findByPk(postData.parentPostId, {
        include: [{model: db.User, as: "author", attributes: ["uid", "displayName"]}],
      });
      if (parentPost && parentPost.clubId === clubIdInt) {
        // Truncate to ~150 characters for preview
        parentPostText = parentPost.text.length > 150 ?
          parentPost.text.substring(0, 150) + "..." :
          parentPost.text;
        parentAuthorName = parentPost.authorName || parentPost.author?.displayName || "Unknown";
      }
    }

    const post = await db.Post.create({
      ...postData,
      clubId: clubIdInt,
      parentPostText,
      parentAuthorName,
    });

    // Fetch with associations for Socket.io event
    const postWithAssociations = await db.Post.findByPk(post.id, {
      include: [
        {model: db.User, as: "author", attributes: ["uid", "displayName", "photoUrl"]},
        {
          model: db.PostReaction,
          as: "reactions",
          include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
        },
      ],
    });

    // Emit Socket.io event via Cloud Run service
    await emitToClub(clubIdInt, "post:created", {id: post.id, ...postWithAssociations.toJSON()});

    res.status(201).json({id: post.id, ...postWithAssociations.toJSON()});
  } catch (e) {
    next(e);
  }
};

// POST /v1/posts/:postId/reactions - Add reaction
const addReaction = async (req, res, next) => {
  try {
    const {postId} = req.params;
    const {clubId} = req.query;
    const {emoji, userId} = req.body;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!emoji || !userId) {
      const error = new Error("emoji and userId are required");
      error.status = 400;
      throw error;
    }

    // Verify post exists and belongs to club
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
    });

    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }

    // Create or find reaction (unique constraint handles duplicates)
    const [reaction, created] = await db.PostReaction.findOrCreate({
      where: {
        postId: parseInt(postId),
        userId,
        emoji,
      },
      defaults: {
        postId: parseInt(postId),
        userId,
        emoji,
      },
    });

    // Fetch all reactions for this post
    const reactions = await db.PostReaction.findAll({
      where: {postId: parseInt(postId)},
      include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
    });

    // Emit Socket.io event via Cloud Run service
    await emitToClub(parseInt(clubId), "reaction:added", {
      postId: parseInt(postId),
      reaction: reaction.toJSON(),
      reactions: reactions.map((r) => r.toJSON()),
    });

    res.status(created ? 201 : 200).json(reaction.toJSON());
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/posts/:postId/reactions/:emoji - Remove reaction
const removeReaction = async (req, res, next) => {
  try {
    const {postId, emoji} = req.params;
    const {clubId, userId} = req.query;

    if (!clubId || !userId) {
      const error = new Error("clubId and userId are required");
      error.status = 400;
      throw error;
    }

    // Verify post exists and belongs to club
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
    });

    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }

    // Delete reaction
    const deleted = await db.PostReaction.destroy({
      where: {
        postId: parseInt(postId),
        userId,
        emoji: decodeURIComponent(emoji),
      },
    });

    if (deleted === 0) {
      const error = new Error("Reaction not found");
      error.status = 404;
      throw error;
    }

    // Fetch remaining reactions for this post
    const reactions = await db.PostReaction.findAll({
      where: {postId: parseInt(postId)},
      include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
    });

    // Emit Socket.io event via Cloud Run service
    await emitToClub(parseInt(clubId), "reaction:removed", {
      postId: parseInt(postId),
      emoji: decodeURIComponent(emoji),
      userId,
      reactions: reactions.map((r) => r.toJSON()),
    });

    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// GET /v1/posts/:postId/reactions - Get all reactions for a post
const getReactions = async (req, res, next) => {
  try {
    const {postId} = req.params;
    const {clubId} = req.query;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }

    // Verify post exists and belongs to club
    const post = await db.Post.findOne({
      where: {
        id: parseInt(postId),
        clubId: parseInt(clubId),
      },
    });

    if (!post) {
      const error = new Error("Post not found");
      error.status = 404;
      throw error;
    }

    const reactions = await db.PostReaction.findAll({
      where: {postId: parseInt(postId)},
      include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
      order: [["created_at", "ASC"]],
    });

    res.json(reactions.map((r) => r.toJSON()));
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getPosts,
  getPost,
  createPost,
  addReaction,
  removeReaction,
  getReactions,
};

