const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const dbService = require("../services/databaseService");

// GET /v1/meetings - Get all meetings
router.get("/", async (req, res) => {
  try {
    const meetings = await dbService.getMeetings();
    const meetingsData = meetings.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    res.json(meetingsData);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({error: "Failed to fetch meetings"});
  }
});

module.exports = router;
