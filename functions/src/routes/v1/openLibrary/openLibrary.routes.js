const express = require("express");
const {
  proxySearch,
  proxyWork,
  proxyAuthor,
  proxyWorkEditions,
  proxyEdition,
} = require("./openLibrary.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router.get("/search", proxySearch);
router.get("/work", proxyWork);
router.get("/author", proxyAuthor);
router.get("/work-editions", proxyWorkEditions);
router.get("/edition", proxyEdition);

module.exports = router;
