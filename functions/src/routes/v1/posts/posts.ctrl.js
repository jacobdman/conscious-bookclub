const db = require("../../../../db/models/index");

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
      include: [{model: db.User, as: "author", attributes: ["uid", "displayName", "photoUrl"]}],
    });
    res.json(posts.map((post) => ({id: post.id, ...post.toJSON()})));
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
    const post = await db.Post.create({
      ...postData,
      clubId: parseInt(clubId),
    });
    res.status(201).json({id: post.id, ...post.toJSON()});
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getPosts,
  createPost,
};

