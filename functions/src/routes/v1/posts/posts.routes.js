const express = require("express");
const {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  addReaction,
  removeReaction,
  getReactions,
} = require("./posts.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getPosts)
    .get("/:postId", getPost)
    .post("/", createPost)
    .put("/:postId", updatePost)
    .delete("/:postId", deletePost)
    .post("/:postId/reactions", addReaction)
    .delete("/:postId/reactions/:emoji", removeReaction)
    .get("/:postId/reactions", getReactions);

module.exports = router;

