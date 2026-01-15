const db = require("../../../../db/models/index");

// Helper function to verify user is member of club
const verifyMembership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId},
  });
  return membership;
};

// GET /v1/clubs/:clubId/books-report?userId=xxx - Get books report with past books progress
const getBooksReport = async (req, res, next) => {
  try {
    const {clubId} = req.params;
    const userId = req.query.userId;

    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    // Verify membership
    const membership = await verifyMembership(parseInt(clubId), userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    // Get total club members count
    const totalMembers = await db.ClubMember.count({
      where: {clubId: parseInt(clubId)},
    });

    // Get all past books (discussionDate < today, not null)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pastBooks = await db.Book.findAll({
      where: {
        clubId: parseInt(clubId),
        chosenForBookclub: true,
        discussionDate: {
          [db.Op.lt]: today,
          [db.Op.ne]: null,
        },
      },
      order: [["discussion_date", "DESC"]], // Most recent first
    });

    const pastBooksProgress = [];
    let completedBooks = 0;

    // Process each book
    for (const book of pastBooks) {
      // Get all BookProgress entries for this book
      const allProgress = await db.BookProgress.findAll({
        where: {bookId: book.id},
      });

      const starters = allProgress.length;
      const finishers = allProgress.filter((p) => p.status === "finished").length;

      // Calculate average completion rate for starters
      let avgCompletionRate = 0;
      if (starters > 0) {
        const totalPercent = allProgress.reduce(
            (sum, p) => sum + (parseFloat(p.percentComplete) || 0),
            0,
        );
        avgCompletionRate = totalPercent / starters;
      }

      // Calculate rates
      const participationRate = totalMembers > 0 ? (starters / totalMembers) * 100 : 0;
      const finishRate = starters > 0 ? (finishers / starters) * 100 : 0;

      // Get book theme (first theme if array, or default)
      const theme = Array.isArray(book.theme) && book.theme.length > 0 ?
        book.theme[0] :
        null;

      pastBooksProgress.push({
        id: book.id,
        title: book.title,
        author: book.author,
        discussionDate: book.discussionDate,
        theme,
        participationRate: Math.round(participationRate * 100) / 100,
        avgCompletionRate: Math.round(avgCompletionRate * 100) / 100,
        finishRate: Math.round(finishRate * 100) / 100,
        starters,
        finishers,
        totalMembers,
      });

      // Track completed books
      if (finishers > 0) {
        completedBooks++;
      }
    }

    // Calculate book completion percentage
    const bookCompletionPercentage = pastBooks.length > 0 ?
      (completedBooks / pastBooks.length) * 100 :
      null;

    res.json({
      bookCompletionPercentage,
      pastBooksProgress,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getBooksReport,
};

