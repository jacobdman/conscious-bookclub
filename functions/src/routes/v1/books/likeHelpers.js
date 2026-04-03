const db = require("../../../../db/models/index");
const {Op} = db.Sequelize;

/** Max names per list on API payloads (discover queue / liker lists). */
const DISCOVER_LIKER_LIST_CAP = 40;

/**
 * @param {number|string} id
 * @return {number|string}
 */
const bookPk = (id) => {
  const n = parseInt(id, 10);
  return Number.isNaN(n) ? id : n;
};

/**
 * Loads "Liked by" and "Super liked by" from book_interactions (like / super_like).
 * @param {number[]} bookIds
 * @param {number} [cap]
 * @return {Promise<Map<number, object>>} Per-book lists, flags, mergedLikeCount.
 */
const loadMergedLikeMemberListsByBookId = async (bookIds, cap = DISCOVER_LIKER_LIST_CAP) => {
  const result = new Map();
  if (!bookIds.length) {
    return result;
  }
  const normalizedIds = bookIds.map(bookPk);

  const interactionRows = await db.BookInteraction.findAll({
    where: {
      bookId: {[Op.in]: normalizedIds},
      action: {[Op.in]: ["like", "super_like"]},
    },
    include: [{
      model: db.User,
      as: "user",
      attributes: ["uid", "displayName"],
      required: false,
    }],
  });

  const buckets = new Map();
  for (const bid of normalizedIds) {
    buckets.set(bid, {likeByUserId: new Map(), superLike: []});
  }

  for (const row of interactionRows) {
    const bid = bookPk(row.bookId);
    const bucket = buckets.get(bid);
    if (!bucket) {
      continue;
    }
    let displayNameRaw = "";
    if (row.user && row.user.displayName) {
      displayNameRaw = String(row.user.displayName).trim();
    }
    const entry = {userId: row.userId, displayName: displayNameRaw || "Unknown"};
    if (row.action === "like") {
      bucket.likeByUserId.set(row.userId, entry);
    } else if (row.action === "super_like") {
      bucket.superLike.push(entry);
    }
  }

  const sortFn = (a, b) =>
    a.displayName.localeCompare(b.displayName, undefined, {sensitivity: "base"});

  for (const bid of normalizedIds) {
    const b = buckets.get(bid);
    const likeArr = Array.from(b.likeByUserId.values());
    likeArr.sort(sortFn);
    b.superLike.sort(sortFn);
    const mergedLikeCount = likeArr.length;
    const likeTrunc = mergedLikeCount > cap;
    const superTrunc = b.superLike.length > cap;
    result.set(bid, {
      likeUsers: likeArr.slice(0, cap),
      superLikeUsers: b.superLike.slice(0, cap),
      likeUsersTruncated: likeTrunc,
      superLikeUsersTruncated: superTrunc,
      mergedLikeCount,
    });
  }
  return result;
};

/**
 * Club-wide like counts (book_interactions action like) and whether the user liked each book.
 * @param {number[]} bookIds
 * @param {string} [userId]
 */
const buildLikesSummary = async (bookIds, userId) => {
  if (!bookIds.length) {
    return {likesByBookId: new Map(), likedBookIds: new Set()};
  }

  const likesCounts = await db.BookInteraction.findAll({
    attributes: [
      "bookId",
      [db.sequelize.fn("COUNT", db.sequelize.col("BookInteraction.id")), "count"],
    ],
    where: {bookId: bookIds, action: "like"},
    group: ["book_id"],
    raw: true,
  });

  const likesByBookId = new Map();
  likesCounts.forEach((row) => {
    likesByBookId.set(row.bookId, parseInt(row.count, 10));
  });

  const likedBookIds = new Set();
  if (userId) {
    const likedRows = await db.BookInteraction.findAll({
      attributes: ["bookId"],
      where: {bookId: bookIds, userId, action: "like"},
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
  loadMergedLikeMemberListsByBookId,
  DISCOVER_LIKER_LIST_CAP,
};
