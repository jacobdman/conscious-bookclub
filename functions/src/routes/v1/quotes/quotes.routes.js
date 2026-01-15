const express = require("express");
const {
  getQuotes,
  createQuote,
  getFeaturedQuote,
  setFeaturedQuote,
  clearFeaturedQuote,
  addQuoteLike,
  removeQuoteLike,
} = require("./quotes.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getQuotes)
    .post("/", createQuote)
    .get("/featured", getFeaturedQuote)
    .delete("/featured", clearFeaturedQuote)
    .post("/:quoteId/feature", setFeaturedQuote)
    .post("/:quoteId/like", addQuoteLike)
    .delete("/:quoteId/like", removeQuoteLike);

module.exports = router;
