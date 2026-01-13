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

const formatQuoteResponse = (quoteInstance) => {
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
  };
};

// GET /v1/quotes?clubId=...&userId=...
const getQuotes = async (req, res, next) => {
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

    res.json(quotes.map(formatQuoteResponse));
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

    res.status(201).json(formatQuoteResponse(quoteWithRelations));
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

    res.json({quote: formatQuoteResponse(featuredQuote), selectedQuoteId});
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

    res.status(200).json({quote: formatQuoteResponse(quote), selectedQuoteId: numericQuoteId});
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

module.exports = {
  getQuotes,
  createQuote,
  getFeaturedQuote,
  setFeaturedQuote,
  clearFeaturedQuote,
};
