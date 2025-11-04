const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const dbService = require("../services/databaseService");

// GET /v1/users - Get all users
router.get("/", async (req, res) => {
  try {
    const users = await dbService.getAllUsers();
    const usersData = users.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.json(usersData);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({error: "Failed to fetch users"});
  }
});

// GET /v1/users/:userId - Get single user
router.get("/:userId", async (req, res) => {
  try {
    const {userId} = req.params;
    const user = await dbService.getUserDocument(userId);

    if (!user.exists()) {
      return res.status(404).json({error: "User not found"});
    }

    res.json({id: userId, ...user.data()});
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({error: "Failed to fetch user"});
  }
});

// POST /v1/users - Create user document
router.post("/", async (req, res) => {
  try {
    const userData = req.body;
    const result = await dbService.createUserDocument(userData);
    res.status(201).json({id: result.uid, ...userData});
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({error: "Failed to create user"});
  }
});

module.exports = router;
