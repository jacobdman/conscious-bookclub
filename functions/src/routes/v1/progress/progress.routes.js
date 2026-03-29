const express = require("express");
const {
  getUserBookProgress,
  updateUserBookProgress,
  deleteUserBookProgress,
  getAllUserBookProgress,
  getAllUsersProgressForBook,
} = require("./progress.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

// Register static path segments before /:userId/:bookId, or "book" and "user"
// are captured as userId and the wrong handlers run.
router.get("/user/:userId", getAllUserBookProgress);
router.get("/book/:bookId", getAllUsersProgressForBook);
router
    .get("/:userId/:bookId", getUserBookProgress)
    .put("/:userId/:bookId", updateUserBookProgress)
    .delete("/:userId/:bookId", deleteUserBookProgress);

module.exports = router;

