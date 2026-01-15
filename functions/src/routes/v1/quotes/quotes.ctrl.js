const db = require("../../../../db/models/index");

// Helpers
const verifyMembership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId},
  });
  return membership;
};

const verifyAdminAccess = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {
      clubId,
      userId,
      role: {[db.Op.in]: ["owner", "admin"]},
    },
  });
  return membership;
};

const formatQuoteResponse = (quoteInstance, {likesCount = 0, isLiked = false} = {}) => {
  const quoteJson = quoteInstance.toJSON();
  const book = quoteJson.book ? {
    id: quoteJson.book.id,
    title: quoteJson.book.title,
    author: quoteJson.book.author,
  } : null;

  const creator = quoteJson.creator ? {
    uid: quoteJson.creator.uid,
    displayName: quoteJson.creator.displayName,
    email: quoteJson.creator.email,
    photoUrl: quoteJson.creator.photoUrl,
  } : undefined;

  const resolvedAuthor = quoteJson.author || (book ? book.author : "anonymous");

  return {
    id: quoteJson.id,
    clubId: quoteJson.clubId,
    quote: quoteJson.quote,
    author: resolvedAuthor,
    book,
    createdBy: quoteJson.createdBy,
    createdAt: quoteJson.createdAt,
    creator,
    likesCount,
    isLiked,
  };
};

const buildLikesSummary = async (quoteIds, userId) => {
  if (!quoteIds.length) {
    return {likesByQuoteId: new Map(), likedQuoteIds: new Set()};
  }

  const likesCounts = await db.QuoteLike.findAll({
    attributes: [
      "quoteId",
      [db.sequelize.fn("COUNT", db.sequelize.col("id")), "count"],
    ],
    where: {quoteId: quoteIds},
    group: ["quote_id"],
    raw: true,
  });

  const likesByQuoteId = new Map();
  likesCounts.forEach((row) => {
    likesByQuoteId.set(row.quoteId, parseInt(row.count, 10));
  });

  const likedRows = await db.QuoteLike.findAll({
    attributes: ["quoteId"],
    where: {quoteId: quoteIds, userId},
    raw: true,
  });

  const likedQuoteIds = new Set(likedRows.map((row) => row.quoteId));

  return {likesByQuoteId, likedQuoteIds};
};

// GET /v1/quotes?clubId=...&userId=...
const getQuotes = async (req, res, next) => {
  try {
    const {clubId, userId, sort} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const membership = await verifyMembership(parseInt(clubId), userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const quotes = await db.Quote.findAll({
      where: {clubId: parseInt(clubId)},
      order: [["created_at", "DESC"]],
      include: [
        {
          model: db.Book,
          as: "book",
          attributes: ["id", "title", "author"],
        },
        {
          model: db.User,
          as: "creator",
          attributes: ["uid", "displayName", "email", "photoUrl"],
        },
      ],
    });

    const quoteIds = quotes.map((quote) => quote.id);
    const {likesByQuoteId, likedQuoteIds} = await buildLikesSummary(quoteIds, userId);

    const response = quotes.map((quote) => formatQuoteResponse(quote, {
      likesCount: likesByQuoteId.get(quote.id) || 0,
      isLiked: likedQuoteIds.has(quote.id),
    }));

    if (sort === "likes_desc") {
      response.sort((a, b) => b.likesCount - a.likesCount ||
        new Date(b.createdAt) - new Date(a.createdAt));
    }

    if (sort === "likes_asc") {
      response.sort((a, b) => a.likesCount - b.likesCount ||
        new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.json(response);
  } catch (e) {
    next(e);
  }
};

// POST /v1/quotes?clubId=...&userId=...
const createQuote = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    const {quote, author, bookId} = req.body || {};

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }
    if (!quote || !quote.toString().trim()) {
      const error = new Error("quote is required");
      error.status = 400;
      throw error;
    }

    const numericClubId = parseInt(clubId);
    const membership = await verifyMembership(numericClubId, userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    let resolvedBookId = null;
    if (bookId !== undefined && bookId !== null) {
      const numericBookId = parseInt(bookId);
      const book = await db.Book.findOne({
        where: {id: numericBookId, clubId: numericClubId},
        attributes: ["id"],
      });

      if (!book) {
        const error = new Error("Book not found in this club");
        error.status = 400;
        throw error;
      }
      resolvedBookId = numericBookId;
    }

    const sanitizeQuoteText = (text) => {
      const trimmed = text.toString().trim();
      return trimmed
          .replace(/^["“”]+/, "")
          .replace(/["“”]+$/, "")
          .trim();
    };

    const cleanedQuote = sanitizeQuoteText(quote);

    const createdQuote = await db.Quote.create({
      clubId: numericClubId,
      quote: cleanedQuote,
      author: author && author.toString().trim() ? author.toString().trim() : null,
      bookId: resolvedBookId,
      createdBy: userId,
    });

    const quoteWithRelations = await db.Quote.findByPk(createdQuote.id, {
      include: [
        {model: db.Book, as: "book", attributes: ["id", "title", "author"]},
        {model: db.User, as: "creator", attributes: ["uid", "displayName", "email", "photoUrl"]},
      ],
    });

    res.status(201).json(formatQuoteResponse(quoteWithRelations, {
      likesCount: 0,
      isLiked: false,
    }));
  } catch (e) {
    next(e);
  }
};

// GET /v1/quotes/featured?clubId=...&userId=...
const getFeaturedQuote = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const numericClubId = parseInt(clubId);
    const membership = await verifyMembership(numericClubId, userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const club = await db.Club.findByPk(numericClubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    const config = club.config || {};
    let featuredQuote = null;
    const selectedQuoteId = config.quoteOfWeekId || null;

    if (config.quoteOfWeekId) {
      featuredQuote = await db.Quote.findOne({
        where: {id: config.quoteOfWeekId, clubId: numericClubId},
        include: [
          {model: db.Book, as: "book", attributes: ["id", "title", "author"]},
          {model: db.User, as: "creator", attributes: ["uid", "displayName", "email", "photoUrl"]},
        ],
      });
    }

    if (!featuredQuote) {
      featuredQuote = await db.Quote.findOne({
        where: {clubId: numericClubId},
        order: db.sequelize.random(),
        include: [
          {model: db.Book, as: "book", attributes: ["id", "title", "author"]},
          {model: db.User, as: "creator", attributes: ["uid", "displayName", "email", "photoUrl"]},
        ],
      });
    }

    if (!featuredQuote) {
      res.json({quote: null, selectedQuoteId: null});
      return;
    }

    const {likesByQuoteId, likedQuoteIds} = await buildLikesSummary([featuredQuote.id], userId);

    res.json({
      quote: formatQuoteResponse(featuredQuote, {
        likesCount: likesByQuoteId.get(featuredQuote.id) || 0,
        isLiked: likedQuoteIds.has(featuredQuote.id),
      }),
      selectedQuoteId,
    });
  } catch (e) {
    next(e);
  }
};

// POST /v1/quotes/:quoteId/feature?clubId=...&userId=...
const setFeaturedQuote = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    const {quoteId} = req.params;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const numericClubId = parseInt(clubId);
    const numericQuoteId = parseInt(quoteId);

    const adminAccess = await verifyAdminAccess(numericClubId, userId);
    if (!adminAccess) {
      const error = new Error("Only club owners or admins can set quote of the week");
      error.status = 403;
      throw error;
    }

    const quote = await db.Quote.findOne({
      where: {id: numericQuoteId, clubId: numericClubId},
      include: [
        {model: db.Book, as: "book", attributes: ["id", "title", "author"]},
        {model: db.User, as: "creator", attributes: ["uid", "displayName", "email", "photoUrl"]},
      ],
    });

    if (!quote) {
      const error = new Error("Quote not found in this club");
      error.status = 404;
      throw error;
    }

    const club = await db.Club.findByPk(numericClubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    const config = {...(club.config || {}), quoteOfWeekId: numericQuoteId};
    await club.update({config});

    const {likesByQuoteId, likedQuoteIds} = await buildLikesSummary([quote.id], userId);
    res.status(200).json({
      quote: formatQuoteResponse(quote, {
        likesCount: likesByQuoteId.get(quote.id) || 0,
        isLiked: likedQuoteIds.has(quote.id),
      }),
      selectedQuoteId: numericQuoteId,
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/quotes/featured?clubId=...&userId=...
const clearFeaturedQuote = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const numericClubId = parseInt(clubId);

    const adminAccess = await verifyAdminAccess(numericClubId, userId);
    if (!adminAccess) {
      const error = new Error("Only club owners or admins can clear quote of the week");
      error.status = 403;
      throw error;
    }

    const club = await db.Club.findByPk(numericClubId);
    if (!club) {
      const error = new Error("Club not found");
      error.status = 404;
      throw error;
    }

    const updatedConfig = {...(club.config || {})};
    delete updatedConfig.quoteOfWeekId;
    await club.update({config: updatedConfig});

    res.status(200).json({message: "Quote of the week cleared", selectedQuoteId: null});
  } catch (e) {
    next(e);
  }
};

// POST /v1/quotes/:quoteId/like?clubId=...&userId=...
const addQuoteLike = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    const {quoteId} = req.params;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const numericClubId = parseInt(clubId);
    const numericQuoteId = parseInt(quoteId);

    const membership = await verifyMembership(numericClubId, userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const quote = await db.Quote.findOne({
      where: {id: numericQuoteId, clubId: numericClubId},
      attributes: ["id"],
    });

    if (!quote) {
      const error = new Error("Quote not found in this club");
      error.status = 404;
      throw error;
    }

    const [like, created] = await db.QuoteLike.findOrCreate({
      where: {quoteId: numericQuoteId, userId},
      defaults: {quoteId: numericQuoteId, userId},
    });

    const likesCount = await db.QuoteLike.count({
      where: {quoteId: numericQuoteId},
    });

    res.status(created ? 201 : 200).json({
      quoteId: numericQuoteId,
      liked: true,
      likesCount,
      likeId: like.id,
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/quotes/:quoteId/like?clubId=...&userId=...
const removeQuoteLike = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    const {quoteId} = req.params;

    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    if (!userId) {
      const error = new Error("userId is required");
      error.status = 400;
      throw error;
    }

    const numericClubId = parseInt(clubId);
    const numericQuoteId = parseInt(quoteId);

    const membership = await verifyMembership(numericClubId, userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const quote = await db.Quote.findOne({
      where: {id: numericQuoteId, clubId: numericClubId},
      attributes: ["id"],
    });

    if (!quote) {
      const error = new Error("Quote not found in this club");
      error.status = 404;
      throw error;
    }

    const deleted = await db.QuoteLike.destroy({
      where: {quoteId: numericQuoteId, userId},
    });

    if (!deleted) {
      const error = new Error("Like not found");
      error.status = 404;
      throw error;
    }

    const likesCount = await db.QuoteLike.count({
      where: {quoteId: numericQuoteId},
    });

    res.status(200).json({
      quoteId: numericQuoteId,
      liked: false,
      likesCount,
    });
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getQuotes,
  createQuote,
  getFeaturedQuote,
  setFeaturedQuote,
  clearFeaturedQuote,
  addQuoteLike,
  removeQuoteLike,
};
