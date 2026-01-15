const db = require("../../../../db/models/index");
const {emitToClub, postIncludes, buildPostResponse} = require("../posts/posts.ctrl");

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

    const book = await db.Book.findOne({where: {id: bookIdInt}});
    if (!book) {
      const error = new Error("Book not found");
      error.status = 404;
      throw error;
    }

    if (!book.chosenForBookclub) {
      const error = new Error("Book is not selected for club reading");
      error.status = 403;
      throw error;
    }

    const existingProgress = await db.BookProgress.findOne({
      where: {userId, bookId: bookIdInt},
    });

    const progressData = req.body;
    const [progress] = await db.BookProgress.upsert({
      userId,
      bookId: bookIdInt,
      ...progressData,
      updatedAt: new Date(),
    });

    const transitionedToFinished =
      progressData?.status === "finished" &&
      existingProgress?.status !== "finished";

    if (transitionedToFinished) {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pastMeeting = await db.Meeting.findOne({
          where: {
            bookId: bookIdInt,
            date: {[db.Op.lt]: today},
          },
        });

        if (!pastMeeting) {
          const user = await db.User.findByPk(userId);
          const clubIdInt = book.clubId;
          const userDisplayName = user?.displayName || user?.email || "A reader";

          const newPost = await db.Post.create({
            authorId: userId,
            authorName: userDisplayName,
            text: "{book_completion_post}",
            clubId: clubIdInt,
            parentPostId: null,
            isSpoiler: false,
            isActivity: true,
            relatedRecordType: "book",
            relatedRecordId: book.id,
          });

          const postWithAssociations = await db.Post.findByPk(newPost.id, {include: postIncludes});
          const serializedPost = await buildPostResponse(postWithAssociations);

          await emitToClub(clubIdInt, "post:created", serializedPost);
        }
      } catch (err) {
        console.error("Failed to create activity post for finished book:", err);
      }
    }

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

