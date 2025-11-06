const db = require("../../../../db/models/index");

// GET /v1/meetings - Get all meetings
const getMeetings = async (req, res, next) => {
  try {
    const meetings = await db.Meeting.findAll({
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

