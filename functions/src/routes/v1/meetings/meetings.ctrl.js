const db = require("../../../../db/models/index");

// GET /v1/meetings - Get all meetings
const getMeetings = async (req, res, next) => {
  try {
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const meetings = await db.Meeting.findAll({
      where: {clubId: parseInt(clubId)},
      order: [["date", "ASC"]],
      include: [{model: db.Book, as: "book", attributes: ["id", "title", "author"]}],
    });
    res.json(meetings.map((meeting) => ({id: meeting.id, ...meeting.toJSON()})));
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getMeetings,
};

