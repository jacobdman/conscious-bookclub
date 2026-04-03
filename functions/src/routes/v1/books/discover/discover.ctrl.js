const db = require("../../../../../db/models/index");
const {Op, QueryTypes} = db.Sequelize;
const {loadMergedLikeMemberListsByBookId} = require("../likeHelpers");

const ACTIVE_USER_DAYS = 30;
const DEFAULT_MIN_THRESHOLD = 3;
const DEFAULT_PERCENTAGE_THRESHOLD = 0.5;
const DEFAULT_SUPER_LIKE_LIMIT = 3;
const BACKLOG_SURVIVAL_MIN_LIKES = 3;
const REVALIDATION_MIN_REVIEWS = 3;
const REVALIDATION_SURVIVAL_RATIO = 0.5;

const verifyMembership = async (clubId, userId) => {
  return db.ClubMember.findOne({where: {clubId, userId}});
};

const getDiscoveryConfig = (club) => {
  const cfg = (club && club.config && club.config.bookDiscovery) || {};
  return {
    minThreshold: cfg.minThreshold ?? DEFAULT_MIN_THRESHOLD,
    percentageThreshold: cfg.percentageThreshold ?? DEFAULT_PERCENTAGE_THRESHOLD,
    superLikeLimit: cfg.superLikeLimit ?? DEFAULT_SUPER_LIKE_LIMIT,
    backlogSurvivalMinLikes: cfg.backlogSurvivalMinLikes ?? BACKLOG_SURVIVAL_MIN_LIKES,
    revalidationMinReviews: cfg.revalidationMinReviews ?? REVALIDATION_MIN_REVIEWS,
    revalidationSurvivalRatio: cfg.revalidationSurvivalRatio ?? REVALIDATION_SURVIVAL_RATIO,
  };
};

/**
 * Members of the club whose last login is within ACTIVE_USER_DAYS.
 * Uses users.last_login_at (not book activity) so members who rarely interact
 * with suggestions still affect the promotion threshold.
 * @param {number|string} clubId
 * @return {Promise<number>}
 */
const getActiveUserCount = async (clubId) => {
  const since = new Date();
  since.setDate(since.getDate() - ACTIVE_USER_DAYS);
  const rows = await db.sequelize.query(
      `SELECT COUNT(*)::int AS cnt
       FROM club_members cm
       INNER JOIN users u ON u.uid = cm.user_id
       WHERE cm.club_id = :clubId
       AND u.last_login_at >= :since`,
      {
        replacements: {clubId: parseInt(clubId, 10), since},
        type: QueryTypes.SELECT,
      },
  );
  const row = rows && rows[0];
  return row && row.cnt != null ? parseInt(row.cnt, 10) : 0;
};

const getPromotionThreshold = async (clubId, club) => {
  const cfg = getDiscoveryConfig(club);
  const activeUsers = await getActiveUserCount(clubId);
  return Math.max(
      cfg.minThreshold,
      Math.ceil(activeUsers * cfg.percentageThreshold),
  );
};

/**
 * Promote a suggested book to backlog when regular like count meets the club
 * threshold. Super likes promote immediately in postDiscoverInteract and are
 * not counted toward this threshold.
 * @param {number} bookId Book id.
 * @param {number|string} clubId Club id.
 *
 * Note on `pass`: context-dependent semantics — discovery pass is personal hide;
 * revalidation pass (updated_at >= revalidation_requested_at) is a negative
 * survival signal (see evaluateRevalidationSurvival).
 */
const checkAndPromoteBook = async (bookId, clubId) => {
  const book = await db.Book.findByPk(bookId);
  if (!book || book.pool !== "suggested") {
    return;
  }
  const club = await db.Club.findByPk(parseInt(clubId, 10));
  const threshold = await getPromotionThreshold(clubId, club);
  const likesCount = await db.BookInteraction.count({
    where: {
      bookId,
      action: "like",
    },
  });
  if (likesCount >= threshold) {
    await db.Book.update(
        {pool: "backlog", promotedAt: new Date()},
        {where: {id: bookId}},
    );
  }
};

const checkSuperLikeRemovalSurvival = async (bookId, clubId) => {
  const bookRow = await db.Book.findByPk(bookId);
  if (!bookRow || bookRow.chosenForBookclub) {
    return;
  }

  const club = await db.Club.findByPk(parseInt(clubId, 10));
  const cfg = getDiscoveryConfig(club);

  const superCount = await db.BookInteraction.count({
    where: {bookId, action: "super_like"},
  });
  if (superCount > 0) {
    return;
  }

  const likesCount = await db.BookInteraction.count({
    where: {bookId, action: "like"},
  });
  if (likesCount < cfg.backlogSurvivalMinLikes) {
    await db.Book.update(
        {
          pool: "suggested",
          promotedAt: null,
          revalidationRequestedAt: null,
        },
        {where: {id: bookId}},
    );
  }
};

const evaluateRevalidationSurvival = async (bookId, clubId) => {
  const club = await db.Club.findByPk(parseInt(clubId, 10));
  const cfg = getDiscoveryConfig(club);

  const book = await db.Book.findByPk(bookId);
  if (!book || !book.revalidationRequestedAt) {
    return;
  }

  const cutoff = book.revalidationRequestedAt;

  const freshLikes = await db.BookInteraction.count({
    where: {
      bookId,
      action: "like",
      updatedAt: {[Op.gte]: cutoff},
    },
  });
  const freshPasses = await db.BookInteraction.count({
    where: {
      bookId,
      action: "pass",
      updatedAt: {[Op.gte]: cutoff},
    },
  });

  const totalReviews = freshLikes + freshPasses;
  if (totalReviews < cfg.revalidationMinReviews) {
    return;
  }

  const survivalRatio = freshLikes / totalReviews;
  if (survivalRatio < cfg.revalidationSurvivalRatio) {
    await db.Book.update(
        {
          pool: "suggested",
          promotedAt: null,
          revalidationRequestedAt: null,
        },
        {where: {id: bookId}},
    );
  } else {
    await db.Book.update(
        {revalidationRequestedAt: null},
        {where: {id: bookId}},
    );
  }
};

/**
 * Counts super likes that consume quota (excludes books selected for reading; refunded).
 * @param {string} userId
 * @param {string|number} clubId
 */
const countUserSuperLikesInClub = async (userId, clubId) => {
  const rows = await db.sequelize.query(
      `SELECT COUNT(*)::int AS c FROM book_interactions bi
       INNER JOIN books b ON b.id = bi.book_id
       WHERE bi.user_id = :userId AND b.club_id = :clubId AND bi.action = 'super_like'
         AND b.chosen_for_bookclub = false`,
      {
        replacements: {userId, clubId: parseInt(clubId, 10)},
        type: QueryTypes.SELECT,
      },
  );
  const row = rows && rows[0];
  return row && row.c != null ? parseInt(row.c, 10) : 0;
};

const upsertInteraction = async (bookId, userId, action, now) => {
  const [row, created] = await db.BookInteraction.findOrCreate({
    where: {bookId, userId, action},
    defaults: {
      bookId,
      userId,
      action,
      createdAt: now,
      updatedAt: now,
    },
  });
  if (!created) {
    await row.update({updatedAt: now});
  }
  return row;
};

const UPLOADER_INCLUDE = {
  model: db.User,
  as: "uploader",
  attributes: ["uid", "displayName"],
  required: false,
};

const BATCH_SIZE = 200;

/**
 * Normalize PKs so Map lookups match Sequelize (number vs string mismatch breaks filters).
 * @param {number|string} id Book id.
 * @return {number|string} Numeric id when parseable, else original.
 */
const bookPk = (id) => {
  const n = parseInt(id, 10);
  return Number.isNaN(n) ? id : n;
};

/**
 * Cursor for suggested-pool books: older than anchor (created_at DESC, id DESC).
 * @param {number|string} clubId Club id.
 * @param {object|null} anchorBook Previous page last book or null.
 * @return {object} Sequelize where clause.
 */
const suggestedPoolWhereAfter = (clubId, anchorBook) => {
  const base = {
    clubId: parseInt(clubId, 10),
    pool: "suggested",
    chosenForBookclub: false,
  };
  if (!anchorBook) {
    return base;
  }
  const anchorTs = anchorBook.createdAt;
  return {
    ...base,
    [Op.or]: [
      db.sequelize.where(db.sequelize.col("Book.created_at"), Op.lt, anchorTs),
      {
        [Op.and]: [
          db.sequelize.where(db.sequelize.col("Book.created_at"), Op.eq, anchorTs),
          {id: {[Op.lt]: anchorBook.id}},
        ],
      },
    ],
  };
};

/**
 * Cursor for backlog revalidation: after anchor (revalidation_at ASC, id ASC).
 * @param {number|string} clubId Club id.
 * @param {object|null} anchorBook Previous page last book or null.
 * @return {object} Sequelize where clause.
 */
const backlogRevalWhereAfter = (clubId, anchorBook) => {
  const base = {
    clubId: parseInt(clubId, 10),
    pool: "backlog",
    revalidationRequestedAt: {[Op.ne]: null},
    chosenForBookclub: false,
  };
  if (!anchorBook) {
    return base;
  }
  const rv = anchorBook.revalidationRequestedAt;
  return {
    ...base,
    [Op.or]: [
      db.sequelize.where(
          db.sequelize.col("Book.revalidation_requested_at"),
          Op.gt,
          rv,
      ),
      {
        [Op.and]: [
          db.sequelize.where(
              db.sequelize.col("Book.revalidation_requested_at"),
              Op.eq,
              rv,
          ),
          {id: {[Op.gt]: anchorBook.id}},
        ],
      },
    ],
  };
};

/**
 * Loads user interaction flags for suggested-pool discover filtering (one query per batch).
 * @param {number[]} bookIds
 * @param {string} userId
 * @return {Promise<Map>} bookId -> blocked and hasBookmark
 */
const buildDiscoverFilterMapForBookIds = async (bookIds, userId) => {
  const map = new Map();
  if (!bookIds.length) {
    return map;
  }
  const normalizedIds = bookIds.map(bookPk);
  for (const bid of normalizedIds) {
    map.set(bid, {blocked: false, hasBookmark: false});
  }
  const rows = await db.BookInteraction.findAll({
    where: {
      bookId: {[Op.in]: normalizedIds},
      userId,
      action: {[Op.in]: ["like", "super_like", "pass", "bookmark"]},
    },
  });
  for (const row of rows) {
    const bid = bookPk(row.bookId);
    const info = map.get(bid);
    if (!info) {
      continue;
    }
    if (["like", "super_like", "pass"].includes(row.action)) {
      info.blocked = true;
    }
    if (row.action === "bookmark") {
      info.hasBookmark = true;
    }
  }
  return map;
};

const passesDiscoverFiltersFromMap = (bid, filterMap) => {
  const info = filterMap.get(bookPk(bid));
  if (!info) {
    return true;
  }
  if (info.blocked) {
    return false;
  }
  if (info.hasBookmark) {
    return false;
  }
  return true;
};

/**
 * Book ids already reviewed for revalidation in this batch (like/pass since book's cutoff).
 * @param {number[]} batchIds
 * @param {string} userId
 * @return {Promise<Set<number>>}
 */
const loadBacklogReviewedBookIdsInBatch = async (batchIds, userId) => {
  if (!batchIds.length) {
    return new Set();
  }
  const rows = await db.BookInteraction.findAll({
    attributes: ["bookId"],
    where: {
      userId,
      bookId: {[Op.in]: batchIds},
      action: {[Op.in]: ["like", "pass"]},
    },
    include: [{
      model: db.Book,
      as: "book",
      attributes: [],
      required: true,
      where: db.sequelize.where(
          db.sequelize.col("BookInteraction.updated_at"),
          Op.gte,
          db.sequelize.col("book.revalidation_requested_at"),
      ),
    }],
  });
  return new Set(rows.map((r) => r.bookId).filter(Boolean));
};

/**
 * Hot queue: suggested books with club-wide regular-like momentum, excluding user block/bookmark.
 * @param {number|string} clubId
 * @param {string} userId
 * @param {number} limitNum
 * @param {number} threshold
 * @return {Promise<object[]>} Sequelize Book instances with uploader, ordered by like_count DESC.
 */
const loadHotQueueBooks = async (clubId, userId, limitNum, threshold) => {
  const cid = parseInt(clubId, 10);
  const minLc = Math.max(0, threshold - 2);
  const rows = await db.sequelize.query(
      `SELECT b.id AS id, agg.lc AS like_count
       FROM books b
       INNER JOIN (
         SELECT book_id, COUNT(*)::int AS lc
         FROM book_interactions
         WHERE action = 'like'
         GROUP BY book_id
         HAVING COUNT(*) >= :minLc
       ) agg ON agg.book_id = b.id
       WHERE b.club_id = :clubId AND b.pool = 'suggested'
       AND b.chosen_for_bookclub = false
       AND NOT EXISTS (
         SELECT 1 FROM book_interactions bi
         WHERE bi.book_id = b.id AND bi.user_id = :userId
         AND bi.action IN ('like', 'super_like', 'pass')
       )
       AND NOT EXISTS (
         SELECT 1 FROM book_interactions bm
         WHERE bm.book_id = b.id AND bm.user_id = :userId AND bm.action = 'bookmark'
       )
       ORDER BY agg.lc DESC, b.id DESC
       LIMIT :limitNum`,
      {
        replacements: {
          clubId: cid,
          userId,
          minLc,
          limitNum,
        },
        type: QueryTypes.SELECT,
      },
  );
  const rowList = Array.isArray(rows) ? rows : [];
  const orderedIds = rowList.map((r) => r.id).filter(Boolean);
  if (!orderedIds.length) {
    return [];
  }
  const bookMap = await db.Book.findAll({
    where: {id: {[Op.in]: orderedIds}},
    include: [UPLOADER_INCLUDE],
  });
  const byId = new Map(bookMap.map((bk) => [bk.id, bk]));
  return orderedIds.map((id) => byId.get(id)).filter(Boolean);
};

/**
 * Champion queue: among the top (limitNum * 3) books by super_like recency, apply
 * the same user visibility rules as before, return up to limitNum in mx order.
 * @param {number|string} clubId
 * @param {string} userId
 * @param {number} limitNum
 * @return {Promise<object[]>} Sequelize Book instances with uploader
 */
const loadChampionQueueBooks = async (clubId, userId, limitNum) => {
  const cid = parseInt(clubId, 10);
  const candidateLim = limitNum * 3;
  const rows = await db.sequelize.query(
      `WITH ranked AS (
         SELECT bi.book_id AS book_id, MAX(bi.updated_at) AS mx
         FROM book_interactions bi
         INNER JOIN books b ON b.id = bi.book_id
         WHERE b.club_id = :clubId AND b.pool = 'suggested'
         AND b.chosen_for_bookclub = false AND bi.action = 'super_like'
         GROUP BY bi.book_id
         ORDER BY mx DESC
         LIMIT :candidateLim
       )
       SELECT r.book_id AS id, r.mx
       FROM ranked r
       WHERE NOT EXISTS (
         SELECT 1 FROM book_interactions bi
         WHERE bi.book_id = r.book_id AND bi.user_id = :userId
         AND bi.action IN ('like', 'super_like', 'pass')
       )
       AND NOT EXISTS (
         SELECT 1 FROM book_interactions bm
         WHERE bm.book_id = r.book_id AND bm.user_id = :userId AND bm.action = 'bookmark'
       )
       ORDER BY r.mx DESC
       LIMIT :limitNum`,
      {
        replacements: {
          clubId: cid,
          userId,
          candidateLim,
          limitNum,
        },
        type: QueryTypes.SELECT,
      },
  );
  const rowList = Array.isArray(rows) ? rows : [];
  const orderedIds = rowList.map((r) => r.id).filter(Boolean);
  if (!orderedIds.length) {
    return [];
  }
  const bookMap = await db.Book.findAll({
    where: {id: {[Op.in]: orderedIds}},
    include: [UPLOADER_INCLUDE],
  });
  const byId = new Map(bookMap.map((bk) => [bk.id, bk]));
  return orderedIds.map((id) => byId.get(id)).filter(Boolean);
};

const loadDiscoverSuggestedPage = async (clubId, userId, limitNum, afterBookId) => {
  let anchor = null;
  if (afterBookId) {
    anchor = await db.Book.findByPk(parseInt(afterBookId, 10));
    if (!anchor || anchor.clubId !== parseInt(clubId, 10) || anchor.pool !== "suggested") {
      const err = new Error("Invalid afterBookId for discover queue");
      err.status = 400;
      throw err;
    }
  }

  const books = [];
  let cursorWhere = suggestedPoolWhereAfter(clubId, anchor);

  while (books.length < limitNum) {
    const batch = await db.Book.findAll({
      where: cursorWhere,
      order: [
        ["created_at", "DESC"],
        ["id", "DESC"],
      ],
      limit: BATCH_SIZE,
      include: [UPLOADER_INCLUDE],
    });
    if (!batch.length) {
      break;
    }
    const batchIds = batch.map((b) => b.id);
    const filterMap = await buildDiscoverFilterMapForBookIds(batchIds, userId);
    for (const b of batch) {
      if (books.length >= limitNum) {
        break;
      }
      if (!passesDiscoverFiltersFromMap(b.id, filterMap)) {
        continue;
      }
      books.push(b);
    }
    const last = batch[batch.length - 1];
    cursorWhere = suggestedPoolWhereAfter(clubId, last);
    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  const hasMore = books.length === limitNum;
  return {books, hasMore};
};

const loadBacklogReviewPage = async (clubId, userId, limitNum, afterBookId) => {
  let anchor = null;
  if (afterBookId) {
    anchor = await db.Book.findByPk(parseInt(afterBookId, 10));
    const invalidBacklogAnchor =
      !anchor ||
      anchor.clubId !== parseInt(clubId, 10) ||
      anchor.pool !== "backlog" ||
      !anchor.revalidationRequestedAt;
    if (invalidBacklogAnchor) {
      const err = new Error("Invalid afterBookId for backlog_review queue");
      err.status = 400;
      throw err;
    }
  }

  const books = [];
  let cursorWhere = backlogRevalWhereAfter(clubId, anchor);

  while (books.length < limitNum) {
    const batch = await db.Book.findAll({
      where: cursorWhere,
      order: [
        ["revalidation_requested_at", "ASC"],
        ["id", "ASC"],
      ],
      limit: BATCH_SIZE,
      include: [UPLOADER_INCLUDE],
    });
    if (!batch.length) {
      break;
    }
    const batchIds = batch.map((b) => b.id);
    const reviewedIds = await loadBacklogReviewedBookIdsInBatch(batchIds, userId);
    for (const b of batch) {
      if (books.length >= limitNum) {
        break;
      }
      if (reviewedIds.has(b.id)) {
        continue;
      }
      books.push(b);
    }
    const last = batch[batch.length - 1];
    cursorWhere = backlogRevalWhereAfter(clubId, last);
    if (batch.length < BATCH_SIZE) {
      break;
    }
  }

  const hasMore = books.length === limitNum;
  return {books, hasMore};
};

const getDiscoverQueue = async (req, res, next) => {
  try {
    const {clubId, userId, queue = "discover", limit = 20, afterBookId} = req.query;
    if (!clubId || !userId) {
      const err = new Error("clubId and userId are required");
      err.status = 400;
      throw err;
    }
    const membership = await verifyMembership(parseInt(clubId, 10), userId);
    if (!membership) {
      const err = new Error("Club not found or user is not a member");
      err.status = 404;
      throw err;
    }

    const club = await db.Club.findByPk(parseInt(clubId, 10));
    const cfg = getDiscoveryConfig(club);
    const threshold = await getPromotionThreshold(clubId, club);
    const limitNum = Math.min(parseInt(limit, 10) || 20, 50);

    let books = [];
    let queueHasMore = false;

    if (queue === "discover") {
      const page = await loadDiscoverSuggestedPage(
          clubId,
          userId,
          limitNum,
          afterBookId || null,
      );
      books = page.books;
      queueHasMore = page.hasMore;
    } else if (queue === "hot") {
      books = await loadHotQueueBooks(
          clubId,
          userId,
          limitNum,
          threshold,
      );
    } else if (queue === "champion") {
      books = await loadChampionQueueBooks(
          clubId,
          userId,
          limitNum,
      );
    } else if (queue === "bookmarked") {
      let markWhere = {userId, action: "bookmark"};
      if (afterBookId) {
        const prev = await db.BookInteraction.findOne({
          where: {
            userId,
            action: "bookmark",
            bookId: parseInt(afterBookId, 10),
          },
          include: [{
            model: db.Book,
            as: "book",
            where: {clubId: parseInt(clubId, 10)},
            required: true,
          }],
        });
        if (!prev) {
          const err = new Error("Invalid afterBookId for bookmarked queue");
          err.status = 400;
          throw err;
        }
        markWhere = {
          userId,
          action: "bookmark",
          [Op.or]: [
            {updatedAt: {[Op.lt]: prev.updatedAt}},
            {
              [Op.and]: [
                {updatedAt: prev.updatedAt},
                {id: {[Op.lt]: prev.id}},
              ],
            },
          ],
        };
      }
      const marks = await db.BookInteraction.findAll({
        where: markWhere,
        include: [{
          model: db.Book,
          as: "book",
          where: {
            clubId: parseInt(clubId, 10),
            chosenForBookclub: false,
          },
          required: true,
          include: [UPLOADER_INCLUDE],
        }],
        order: [
          ["updated_at", "DESC"],
          ["id", "DESC"],
        ],
        limit: limitNum,
      });
      books = marks.map((m) => m.book).filter(Boolean);
      queueHasMore = books.length === limitNum;
    } else if (queue === "backlog_review") {
      const page = await loadBacklogReviewPage(
          clubId,
          userId,
          limitNum,
          afterBookId || null,
      );
      books = page.books;
      queueHasMore = page.hasMore;
    } else {
      const err = new Error("Invalid queue parameter");
      err.status = 400;
      throw err;
    }

    const bookIds = books.map((b) => b.id);
    const superByBookId = new Map();
    let memberListsByBookId = new Map();
    if (bookIds.length) {
      const [superCounts, memberLists] = await Promise.all([
        db.BookInteraction.findAll({
          attributes: [
            "bookId",
            [db.sequelize.fn("COUNT", db.sequelize.col("id")), "cnt"],
          ],
          where: {bookId: bookIds, action: "super_like"},
          group: ["book_id"],
          raw: true,
        }),
        loadMergedLikeMemberListsByBookId(bookIds),
      ]);
      superCounts.forEach((row) => {
        superByBookId.set(row.bookId, parseInt(row.cnt, 10));
      });
      memberListsByBookId = memberLists;
    }

    const usedSuper = await countUserSuperLikesInClub(userId, clubId);
    const remainingSuperLikes = Math.max(0, cfg.superLikeLimit - usedSuper);

    const emptyMembers = {
      likeUsers: [],
      superLikeUsers: [],
      likeUsersTruncated: false,
      superLikeUsersTruncated: false,
      mergedLikeCount: 0,
    };

    const payload = books.map((book) => {
      const j = book.toJSON();
      const pk = bookPk(book.id);
      const members = memberListsByBookId.get(pk) || emptyMembers;
      return {
        id: book.id,
        ...j,
        likesCount: members.mergedLikeCount ?? 0,
        superLikesCount: superByBookId.get(book.id) || 0,
        remainingSuperLikes,
        promotionThreshold: threshold,
        likeUsers: members.likeUsers,
        superLikeUsers: members.superLikeUsers,
        likeUsersTruncated: members.likeUsersTruncated,
        superLikeUsersTruncated: members.superLikeUsersTruncated,
      };
    });

    const lastBook = books.length ? books[books.length - 1] : null;
    const nextCursor =
      queueHasMore && lastBook ? {afterBookId: lastBook.id} : null;

    res.json({
      books: payload,
      remainingSuperLikes,
      promotionThreshold: threshold,
      hasMore: queueHasMore,
      nextCursor,
    });
  } catch (e) {
    next(e);
  }
};

const getDiscoverStats = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    if (!clubId || !userId) {
      const err = new Error("clubId and userId are required");
      err.status = 400;
      throw err;
    }
    const membership = await verifyMembership(parseInt(clubId, 10), userId);
    if (!membership) {
      const err = new Error("Club not found or user is not a member");
      err.status = 404;
      throw err;
    }
    const club = await db.Club.findByPk(parseInt(clubId, 10));
    const cfg = getDiscoveryConfig(club);

    const usedSuper = await countUserSuperLikesInClub(userId, clubId);
    const remainingSuperLikes = Math.max(0, cfg.superLikeLimit - usedSuper);

    const tiRows = await db.sequelize.query(
        `SELECT COUNT(*)::int AS c FROM book_interactions bi
         INNER JOIN books b ON b.id = bi.book_id
         WHERE bi.user_id = :userId AND b.club_id = :clubId`,
        {
          replacements: {userId, clubId: parseInt(clubId, 10)},
          type: QueryTypes.SELECT,
        },
    );
    const tiRow = tiRows && tiRows[0];
    const totalInteractions = tiRow && tiRow.c != null ? parseInt(tiRow.c, 10) : 0;

    const bmRows = await db.sequelize.query(
        `SELECT COUNT(*)::int AS c FROM book_interactions bi
         INNER JOIN books b ON b.id = bi.book_id
         WHERE bi.user_id = :userId AND b.club_id = :clubId AND bi.action = 'bookmark'
         AND b.chosen_for_bookclub = false`,
        {
          replacements: {userId, clubId: parseInt(clubId, 10)},
          type: QueryTypes.SELECT,
        },
    );
    const bmRow = bmRows && bmRows[0];
    const bookmarkedCount = bmRow && bmRow.c != null ? parseInt(bmRow.c, 10) : 0;

    res.json({
      remainingSuperLikes,
      totalInteractions,
      bookmarkedCount,
    });
  } catch (e) {
    next(e);
  }
};

const postDiscoverInteract = async (req, res, next) => {
  try {
    const {id} = req.params;
    const {clubId, userId} = req.query;
    const {action} = req.body || {};
    if (!clubId || !userId) {
      const err = new Error("clubId and userId are required");
      err.status = 400;
      throw err;
    }
    if (!["like", "super_like", "pass", "bookmark"].includes(action)) {
      const err = new Error("Invalid action");
      err.status = 400;
      throw err;
    }

    const membership = await verifyMembership(parseInt(clubId, 10), userId);
    if (!membership) {
      const err = new Error("Club not found or user is not a member");
      err.status = 404;
      throw err;
    }

    const book = await db.Book.findOne({
      where: {id: parseInt(id, 10), clubId: parseInt(clubId, 10)},
    });
    if (!book) {
      const err = new Error("Book not found");
      err.status = 404;
      throw err;
    }

    const club = await db.Club.findByPk(parseInt(clubId, 10));
    const cfg = getDiscoveryConfig(club);
    const now = new Date();

    if (action === "super_like") {
      if (book.pool === "backlog") {
        const err = new Error(
            "Super likes are only for books in the suggested pool, not the backlog",
        );
        err.status = 400;
        err.code = "super_like_backlog_not_allowed";
        throw err;
      }
      const used = await countUserSuperLikesInClub(userId, clubId);
      if (used >= cfg.superLikeLimit) {
        return res.status(403).json({
          error: "No super likes remaining",
          code: "no_super_likes_remaining",
        });
      }
      await upsertInteraction(book.id, userId, "super_like", now);
      await db.Book.update(
          {pool: "backlog", promotedAt: new Date()},
          {where: {id: book.id}},
      );
    } else if (action === "like") {
      const isRevalidation = book.pool === "backlog" && book.revalidationRequestedAt;
      await upsertInteraction(book.id, userId, "like", now);
      if (isRevalidation) {
        await evaluateRevalidationSurvival(book.id, clubId);
      } else if (book.pool === "suggested") {
        await checkAndPromoteBook(book.id, clubId);
      }
    } else if (action === "pass") {
      const isRevalidation = book.pool === "backlog" && book.revalidationRequestedAt;
      if (isRevalidation) {
        await db.BookInteraction.destroy({
          where: {bookId: book.id, userId, action: "like"},
        });
      }
      await upsertInteraction(book.id, userId, "pass", now);
      if (isRevalidation) {
        await evaluateRevalidationSurvival(book.id, clubId);
      }
    } else if (action === "bookmark") {
      await upsertInteraction(book.id, userId, "bookmark", now);
    }

    const updated = await db.Book.findByPk(book.id);
    const likesCount = await db.BookInteraction.count({
      where: {bookId: book.id, action: "like"},
    });
    const superLikesCount = await db.BookInteraction.count({
      where: {bookId: book.id, action: "super_like"},
    });
    const usedSuper = await countUserSuperLikesInClub(userId, clubId);
    const remainingSuperLikes = Math.max(0, cfg.superLikeLimit - usedSuper);

    res.json({
      book: {...updated.toJSON(), likesCount, superLikesCount},
      remainingSuperLikes,
      promoted: updated.pool === "backlog",
    });
  } catch (e) {
    next(e);
  }
};

const deleteDiscoverInteract = async (req, res, next) => {
  try {
    const {id} = req.params;
    const {clubId, userId, action} = req.query;
    if (!clubId || !userId || !action) {
      const err = new Error("clubId, userId, and action are required");
      err.status = 400;
      throw err;
    }

    const membership = await verifyMembership(parseInt(clubId, 10), userId);
    if (!membership) {
      const err = new Error("Club not found or user is not a member");
      err.status = 404;
      throw err;
    }

    const book = await db.Book.findOne({
      where: {id: parseInt(id, 10), clubId: parseInt(clubId, 10)},
    });
    if (!book) {
      const err = new Error("Book not found");
      err.status = 404;
      throw err;
    }

    await db.BookInteraction.destroy({
      where: {
        bookId: book.id,
        userId,
        action,
      },
    });

    if (action === "super_like") {
      const reloaded = await db.Book.findByPk(book.id);
      if (reloaded && reloaded.pool === "backlog" && !reloaded.chosenForBookclub) {
        await checkSuperLikeRemovalSurvival(book.id, clubId);
      }
    }

    const club = await db.Club.findByPk(parseInt(clubId, 10));
    const cfg = getDiscoveryConfig(club);
    const usedSuper = await countUserSuperLikesInClub(userId, clubId);
    const remainingSuperLikes = Math.max(0, cfg.superLikeLimit - usedSuper);

    const updated = await db.Book.findByPk(book.id);
    const superLikesCount = updated ?
      await db.BookInteraction.count({
        where: {bookId: book.id, action: "super_like"},
      }) :
      0;
    res.json({
      book: updated ? {...updated.toJSON(), superLikesCount} : null,
      remainingSuperLikes,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getDiscoverQueue,
  getDiscoverStats,
  postDiscoverInteract,
  deleteDiscoverInteract,
};
