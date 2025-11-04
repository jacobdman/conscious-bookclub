const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const dbService = require("../services/databaseService");

// GET /v1/progress/:userId/:bookId - Get user's progress for a book
router.get("/:userId/:bookId", async (req, res) => {
  try {
    const {userId, bookId} = req.params;
    // Convert bookId to integer for PostgreSQL
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      return res.status(400).json({error: "Invalid book ID"});
    }

    const progress = await dbService.getUserBookProgress(userId, bookIdInt);

    console.log({progress, userId, bookId});

    // Return 200 with null if no progress exists (valid state, not an error)
    // 404 should only be for route not found, which Express handles automatically
    if (!progress) {
      return res.json(null);
    }

    res.json(progress);
  } catch (error) {
    console.error("Error fetching book progress:", error);
    res.status(500).json({error: "Failed to fetch book progress"});
  }
});

// PUT /v1/progress/:userId/:bookId - Update user's progress for a book
router.put("/:userId/:bookId", async (req, res) => {
  try {
    const {userId, bookId} = req.params;
    // Convert bookId to integer for PostgreSQL
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      return res.status(400).json({error: "Invalid book ID"});
    }

    const progressData = req.body;
    const result = await dbService.updateUserBookProgress(userId, bookIdInt, progressData);
    res.json(result);
  } catch (error) {
    console.error("Error updating book progress:", error);
    res.status(500).json({error: "Failed to update book progress"});
  }
});

// DELETE /v1/progress/:userId/:bookId - Delete user's progress for a book
router.delete("/:userId/:bookId", async (req, res) => {
  try {
    const {userId, bookId} = req.params;
    // Convert bookId to integer for PostgreSQL
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      return res.status(400).json({error: "Invalid book ID"});
    }

    await dbService.deleteUserBookProgress(userId, bookIdInt);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting book progress:", error);
    res.status(500).json({error: "Failed to delete book progress"});
  }
});

// GET /v1/progress/user/:userId - Get all progress for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const {userId} = req.params;
    const progress = await dbService.getAllUserBookProgress(userId);
    res.json(progress);
  } catch (error) {
    console.error("Error fetching user progress:", error);
    res.status(500).json({error: "Failed to fetch user progress"});
  }
});

// GET /v1/progress/book/:bookId - Get all progress for a book
router.get("/book/:bookId", async (req, res) => {
  try {
    const {bookId} = req.params;
    // Convert bookId to integer for PostgreSQL
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      return res.status(400).json({error: "Invalid book ID"});
    }

    const progress = await dbService.getAllUsersProgressForBook(bookIdInt);
    res.json(progress);
  } catch (error) {
    console.error("Error fetching book progress:", error);
    res.status(500).json({error: "Failed to fetch book progress"});
  }
});

module.exports = router;
