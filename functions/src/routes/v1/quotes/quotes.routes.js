const express = require("express");
const {
  getQuotes,
  createQuote,
  getFeaturedQuote,
  setFeaturedQuote,
  clearFeaturedQuote,
} = require("./quotes.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getQuotes)
    .post("/", createQuote)
    .get("/featured", getFeaturedQuote)
    .delete("/featured", clearFeaturedQuote)
    .post("/:quoteId/feature", setFeaturedQuote);

module.exports = router;
