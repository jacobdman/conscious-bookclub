const express = require("express");
const {
  getUserBookProgress,
  updateUserBookProgress,
  deleteUserBookProgress,
  getAllUserBookProgress,
  getAllUsersProgressForBook,
} = require("./progress.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/:userId/:bookId", getUserBookProgress)
    .put("/:userId/:bookId", updateUserBookProgress)
    .delete("/:userId/:bookId", deleteUserBookProgress)
    .get("/user/:userId", getAllUserBookProgress)
    .get("/book/:bookId", getAllUsersProgressForBook);

module.exports = router;

