const express = require("express");
const {
  getMeetings,
  createMeeting,
  updateMeeting,
  getMeetingsICal,
  setMeetingRsvp,
} = require("./meetings.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getMeetings)
    .get("/:clubId/ical", getMeetingsICal)
    .post("/", createMeeting)
    .patch("/:meetingId/rsvp", setMeetingRsvp)
    .patch("/:meetingId", updateMeeting);

module.exports = router;

