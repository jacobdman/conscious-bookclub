const express = require("express");
const {proxySearch, proxyWork, proxyAuthor} = require("./openLibrary.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router.get("/search", proxySearch);
router.get("/work", proxyWork);
router.get("/author", proxyAuthor);

module.exports = router;
