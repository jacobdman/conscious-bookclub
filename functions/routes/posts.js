const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const dbService = require("../services/databaseService");

// GET /v1/posts - Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await dbService.getPosts();
    const postsData = posts.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.json(postsData);
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({error: "Failed to fetch posts"});
  }
});

// POST /v1/posts - Create new post
router.post("/", async (req, res) => {
  try {
    const postData = req.body;
    const result = await dbService.addPost(postData);
    res.status(201).json({id: result.id, ...postData});
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({error: "Failed to create post"});
  }
});

module.exports = router;
