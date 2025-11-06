const express = require("express");
const {getUsers, getUser, createUser} = require("./users.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getUsers)
    .get("/:userId", getUser)
    .post("/", createUser);

module.exports = router;

