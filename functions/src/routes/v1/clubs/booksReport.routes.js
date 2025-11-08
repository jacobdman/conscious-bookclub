const express = require("express");
const {getBooksReport} = require("./booksReport.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router.get("/:clubId/books-report", getBooksReport);

module.exports = router;

