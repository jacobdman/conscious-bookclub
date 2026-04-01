const db = require("../../../../db/models/index");

/**
 * Club-wide like counts (book_likes) and whether the user liked each book.
 * @param {number[]} bookIds
 * @param {string} [userId]
 */
const buildLikesSummary = async (bookIds, userId) => {
  if (!bookIds.length) {
    return {likesByBookId: new Map(), likedBookIds: new Set()};
  }

  const likesCounts = await db.BookLike.findAll({
    attributes: [
      "bookId",
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
    ],
    where: {bookId: bookIds},
    group: ["book_id"],
    raw: true,
  });

  const likesByBookId = new Map();
  likesCounts.forEach((row) => {
    likesByBookId.set(row.bookId, parseInt(row.count, 10));
  });

  const likedBookIds = new Set();
  if (userId) {
    const likedRows = await db.BookLike.findAll({
      attributes: ["bookId"],
      where: {bookId: bookIds, userId},
      raw: true,
    });
    likedRows.forEach((row) => {
      likedBookIds.add(row.bookId);
    });
  }

  return {likesByBookId, likedBookIds};
};

/**
 * Club-wide super-like counts (book_interactions) and whether the user super-liked each book.
 * @param {number[]} bookIds
 * @param {string} [userId]
 */
const buildSuperLikeSummary = async (bookIds, userId) => {
  if (!bookIds.length) {
    return {superLikesByBookId: new Map(), superLikedBookIds: new Set()};
  }

  const superCounts = await db.BookInteraction.findAll({
    attributes: [
      "bookId",
      [db.sequelize.fn("COUNT", db.sequelize.col("BookInteraction.id")), "count"],
    ],
    where: {bookId: bookIds, action: "super_like"},
    group: ["book_id"],
    raw: true,
  });

  const superLikesByBookId = new Map();
  superCounts.forEach((row) => {
    superLikesByBookId.set(row.bookId, parseInt(row.count, 10));
  });

  const superLikedBookIds = new Set();
  if (userId) {
    const superRows = await db.BookInteraction.findAll({
      attributes: ["bookId"],
      where: {bookId: bookIds, userId, action: "super_like"},
      raw: true,
    });
    superRows.forEach((row) => {
      superLikedBookIds.add(row.bookId);
    });
  }

  return {superLikesByBookId, superLikedBookIds};
};

module.exports = {
  buildLikesSummary,
  buildSuperLikeSummary,
};
