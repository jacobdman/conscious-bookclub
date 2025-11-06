const express = require("express");
const {getPosts, createPost} = require("./posts.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getPosts)
    .post("/", createPost);

module.exports = router;

