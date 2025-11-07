const express = require("express");
const {
  getUserClubs,
  getClub,
  getClubMembers,
  updateClub,
  addClubMember,
  removeClubMember,
  updateMemberRole,
  joinClubByInviteCode,
  rotateInviteCode,
  deleteClub,
} = require("./clubs.ctrl");

const router = express.Router(); // eslint-disable-line new-cap

router
    .get("/", getUserClubs)
    .post("/join", joinClubByInviteCode)
    .get("/:clubId", getClub)
    .put("/:clubId", updateClub)
    .post("/:clubId/rotate-invite-code", rotateInviteCode)
    .delete("/:clubId", deleteClub)
    .get("/:clubId/members", getClubMembers)
    .post("/:clubId/members", addClubMember)
    .delete("/:clubId/members/:memberUserId", removeClubMember)
    .put("/:clubId/members/:memberUserId/role", updateMemberRole);

module.exports = router;

