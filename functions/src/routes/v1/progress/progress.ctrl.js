const db = require("../../../../db/models/index");

// GET /v1/progress/:userId/:bookId - Get user's progress for a book
const getUserBookProgress = async (req, res, next) => {
  try {
    const {userId, bookId} = req.params;
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      const error = new Error("Invalid book ID");
      error.status = 400;
      throw error;
    }

    const progress = await db.BookProgress.findOne({
      where: {userId, bookId: bookIdInt},
    });

    // Return 200 with null if no progress exists (valid state, not an error)
    if (!progress) {
      return res.json(null);
    }

    res.json({id: progress.id, ...progress.toJSON()});
  } catch (e) {
    next(e);
  }
};

// PUT /v1/progress/:userId/:bookId - Update user's progress for a book
const updateUserBookProgress = async (req, res, next) => {
  try {
    const {userId, bookId} = req.params;
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      const error = new Error("Invalid book ID");
      error.status = 400;
      throw error;
    }

    const progressData = req.body;
    const [progress] = await db.BookProgress.upsert({
      userId,
      bookId: bookIdInt,
      ...progressData,
      updatedAt: new Date(),
    });
    res.json({id: progress.id, ...progress.toJSON()});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/progress/:userId/:bookId - Delete user's progress for a book
const deleteUserBookProgress = async (req, res, next) => {
  try {
    const {userId, bookId} = req.params;
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      const error = new Error("Invalid book ID");
      error.status = 400;
      throw error;
    }

    await db.BookProgress.destroy({where: {userId, bookId: bookIdInt}});
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// GET /v1/progress/user/:userId - Get all progress for a user
const getAllUserBookProgress = async (req, res, next) => {
  try {
    const {userId} = req.params;
    const progress = await db.BookProgress.findAll({
      where: {userId},
      include: [{
        model: db.Book,
        as: "book",
        attributes: ["id", "title", "author", "coverImage"],
      }],
    });
    res.json(progress.map((p) => ({id: p.id, ...p.toJSON()})));
  } catch (e) {
    next(e);
  }
};

// GET /v1/progress/book/:bookId - Get all progress for a book
const getAllUsersProgressForBook = async (req, res, next) => {
  try {
    const {bookId} = req.params;
    const bookIdInt = parseInt(bookId, 10);
    if (isNaN(bookIdInt)) {
      const error = new Error("Invalid book ID");
      error.status = 400;
      throw error;
    }

    const progress = await db.BookProgress.findAll({
      where: {bookId: bookIdInt, privacy: "public"},
      include: [{model: db.User, as: "user", attributes: ["uid", "displayName", "photoUrl"]}],
    });
    res.json(progress.map((p) => ({id: p.id, ...p.toJSON()})));
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getUserBookProgress,
  updateUserBookProgress,
  deleteUserBookProgress,
  getAllUserBookProgress,
  getAllUsersProgressForBook,
};

