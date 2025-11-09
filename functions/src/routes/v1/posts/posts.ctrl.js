const db = require("../../../../db/models/index");
const {getIO} = require("../../../socket/socket");

// Helper to emit Socket.io events
const emitToClub = (clubId, event, data) => {
  try {
    const io = getIO();
    const room = `club:${clubId}`;
    io.to(room).emit(event, data);
  } catch (error) {
    // Socket.io not initialized yet, that's okay
    console.log("Socket.io not available:", error.message);
  }
};

// GET /v1/posts - Get all posts
const getPosts = async (req, res, next) => {
  try {
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const posts = await db.Post.findAll({
      where: {clubId: parseInt(clubId)},
      order: [["created_at", "DESC"]],
      include: [
        {model: db.User, as: "author", attributes: ["uid", "displayName", "photoUrl"]},
        {
          model: db.PostReaction,
          as: "reactions",
          include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
        },
      ],
    });
    res.json(posts.map((post) => ({id: post.id, ...post.toJSON()})));
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

    // Emit Socket.io event
    emitToClub(clubIdInt, "post:created", {id: post.id, ...postWithAssociations.toJSON()});

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

    // Emit Socket.io event
    emitToClub(parseInt(clubId), "reaction:added", {
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

    // Emit Socket.io event
    emitToClub(parseInt(clubId), "reaction:removed", {
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

