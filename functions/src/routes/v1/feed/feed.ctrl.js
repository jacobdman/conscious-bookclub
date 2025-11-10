const db = require("../../../../db/models/index");

// GET /v1/feed/read-status - Get last read timestamp for current user and club
const getReadStatus = async (req, res, next) => {
  try {
    const {userId, clubId} = req.query;

    if (!userId || !clubId) {
      const error = new Error("userId and clubId are required");
      error.status = 400;
      throw error;
    }

    const readStatus = await db.FeedReadStatus.findOne({
      where: {
        userId,
        clubId: parseInt(clubId),
      },
    });

    if (!readStatus) {
      return res.json({lastReadAt: null});
    }

    res.json({lastReadAt: readStatus.lastReadAt});
  } catch (e) {
    next(e);
  }
};

// POST /v1/feed/mark-read - Update last read timestamp
const markAsRead = async (req, res, next) => {
  try {
    const {userId, clubId} = req.query;
    const {lastReadAt} = req.body;

    if (!userId || !clubId) {
      const error = new Error("userId and clubId are required");
      error.status = 400;
      throw error;
    }

    const timestamp = lastReadAt ? new Date(lastReadAt) : new Date();

    // Upsert: create or update
    const [readStatus] = await db.FeedReadStatus.upsert(
        {
          userId,
          clubId: parseInt(clubId),
          lastReadAt: timestamp,
        },
        {
          returning: true,
        },
    );

    res.json({lastReadAt: readStatus.lastReadAt});
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getReadStatus,
  markAsRead,
};

