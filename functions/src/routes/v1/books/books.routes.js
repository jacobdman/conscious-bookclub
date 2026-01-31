const express = require("express");
const {
  getBooks,
  getDiscussedBooks,
  getFilteredBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  getBooksProgress,
  getTopReaders,
  addBookLike,
  removeBookLike,
} = require("./books.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getBooks)
    .get("/discussed", getDiscussedBooks)
    .get("/filtered", getFilteredBooks)
    .get("/progress", getBooksProgress)
    .get("/top-readers", getTopReaders)
    .get("/:id", getBook)
    .post("/:id/like", addBookLike)
    .delete("/:id/like", removeBookLike)
    .post("/", createBook)
    .put("/:id", updateBook)
    .delete("/:id", deleteBook);

module.exports = router;

