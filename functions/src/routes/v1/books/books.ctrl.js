const db = require("../../../../db/models/index");

// Map camelCase API field names to snake_case database column names
const mapOrderByField = (field) => {
  const fieldMap = {
    createdAt: "created_at",
    created_at: "created_at",
    discussionDate: "discussion_date",
    discussion_date: "discussion_date",
    title: "title",
    author: "author",
    likes: "likes_count",
    likesCount: "likes_count",
  };
  return fieldMap[field] || field;
};

const buildOrderClause = (orderByField, orderDirection) => {
  if (orderByField === "likes_count") {
    return [[db.sequelize.literal(
        `(SELECT COUNT(*) FROM book_likes WHERE book_likes.book_id = "Book".id)`,
    ), orderDirection]];
  }

  return [[orderByField, orderDirection]];
};

const verifyMembership = async (clubId, userId) => {
  const membership = await db.ClubMember.findOne({
    where: {clubId, userId},
  });
  return membership;
};

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

// Helper function to get books page
const getBooksPage = async (
    pageNumber,
    pageSize,
    orderByField,
    orderDirection,
    userId,
    clubId,
    readStatus,
    search,
) => {
  const offset = (pageNumber - 1) * pageSize;

  let whereClause = {};
  if (clubId) {
    whereClause.clubId = parseInt(clubId);
  }

  // Add search filter
  if (search) {
    const searchLower = search.toLowerCase();
    whereClause = {
      ...whereClause,
      [db.Op.or]: [
        db.sequelize.where(
            db.sequelize.fn("LOWER", db.sequelize.col("title")),
            "LIKE",
            `%${searchLower}%`,
        ),
        db.sequelize.where(
            db.sequelize.fn("LOWER", db.sequelize.col("author")),
            "LIKE",
            `%${searchLower}%`,
        ),
      ],
    };
  }

  const includeOptions = [
    {
      model: db.User,
      as: "uploader",
      attributes: ["uid", "displayName"],
      required: false,
    },
  ];
  if (userId) {
    const progressWhere = {userId};
    // If readStatus is 'finished', filter by status and require the association
    if (readStatus === "finished") {
      progressWhere.status = "finished";
    }

    includeOptions.push({
      model: db.BookProgress,
      as: "bookProgresses",
      where: progressWhere,
      // Only include books with finished progress when filtering
      required: readStatus === "finished",
      attributes: [
        "id",
        "userId",
        "bookId",
        "status",
        "percentComplete",
        "privacy",
        "updatedAt",
      ],
    });
  }

  const queryOptions = {
    where: whereClause,
    order: buildOrderClause(orderByField, orderDirection),
    limit: pageSize,
    offset,
  };

  if (includeOptions.length > 0) {
    queryOptions.include = includeOptions;
  }

  const {count, rows} = await db.Book.findAndCountAll(queryOptions);
  const bookIds = rows.map((book) => book.id);
  const {likesByBookId, likedBookIds} = await buildLikesSummary(bookIds, userId);

  return {
    books: rows.map((book) => {
      const bookData = book.toJSON();
      // Set progress to first element of bookProgresses array if present
      bookData.progress = bookData.bookProgresses && bookData.bookProgresses.length > 0 ?
        bookData.bookProgresses[0] : null;
      return {
        id: book.id,
        ...bookData,
        likesCount: likesByBookId.get(book.id) || 0,
        isLiked: likedBookIds.has(book.id),
      };
    }),
    totalCount: count,
  };
};

// Helper function to get books page filtered
const getBooksPageFiltered = async (
    theme,
    pageNumber,
    pageSize,
    orderByField,
    orderDirection,
    userId,
    clubId,
    readStatus,
    search,
) => {
  const offset = (pageNumber - 1) * pageSize;
  let whereClause = {};

  if (clubId) {
    whereClause.clubId = parseInt(clubId);
  }

  if (theme === "no-theme") {
    whereClause = {
      ...whereClause,
      [db.Op.or]: [
        {theme: null},
        {theme: []},
      ],
    };
  } else if (theme !== "all") {
    whereClause = {
      ...whereClause,
      theme: {
        [db.Op.contains]: [theme],
      },
    };
  }

  // Add search filter
  if (search) {
    const searchLower = search.toLowerCase();
    // We need to carefully combine with existing Op.or if present
    const searchCondition = {
      [db.Op.or]: [
        db.sequelize.where(
            db.sequelize.fn("LOWER", db.sequelize.col("title")),
            "LIKE",
            `%${searchLower}%`,
        ),
        db.sequelize.where(
            db.sequelize.fn("LOWER", db.sequelize.col("author")),
            "LIKE",
            `%${searchLower}%`,
        ),
      ],
    };

    // If we already have an Op.or (for no-theme), we need to use Op.and to combine them
    if (whereClause[db.Op.or]) {
      whereClause = {
        [db.Op.and]: [
          whereClause,
          searchCondition,
        ],
      };
    } else {
      whereClause = {
        ...whereClause,
        ...searchCondition,
      };
    }
  }

  const includeOptions = [
    {
      model: db.User,
      as: "uploader",
      attributes: ["uid", "displayName"],
      required: false,
    },
  ];
  if (userId) {
    const progressWhere = {userId};
    // If readStatus is 'finished', filter by status and require the association
    if (readStatus === "finished") {
      progressWhere.status = "finished";
    }

    includeOptions.push({
      model: db.BookProgress,
      as: "bookProgresses",
      where: progressWhere,
      // Only include books with finished progress when filtering
      required: readStatus === "finished",
      attributes: [
        "id",
        "userId",
        "bookId",
        "status",
        "percentComplete",
        "privacy",
        "updatedAt",
      ],
    });
  }

  const queryOptions = {
    where: whereClause,
    order: buildOrderClause(orderByField, orderDirection),
    limit: pageSize,
    offset,
  };

  if (includeOptions.length > 0) {
    queryOptions.include = includeOptions;
  }

  const {count, rows} = await db.Book.findAndCountAll(queryOptions);
  const bookIds = rows.map((book) => book.id);
  const {likesByBookId, likedBookIds} = await buildLikesSummary(bookIds, userId);

  return {
    books: rows.map((book) => {
      const bookData = book.toJSON();
      // Set progress to first element of bookProgresses array if present
      bookData.progress = bookData.bookProgresses && bookData.bookProgresses.length > 0 ?
        bookData.bookProgresses[0] : null;
      return {
        id: book.id,
        ...bookData,
        likesCount: likesByBookId.get(book.id) || 0,
        isLiked: likedBookIds.has(book.id),
      };
    }),
    totalCount: count,
  };
};

// GET /v1/books - Get all books with pagination
const getBooks = async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      orderBy = "created_at",
      orderDirection = "desc",
      userId,
      clubId,
      readStatus,
      search,
    } = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const mappedOrderBy = mapOrderByField(orderBy);
    const result = await getBooksPage(
        parseInt(page),
        parseInt(pageSize),
        mappedOrderBy,
        orderDirection.toUpperCase(),
        userId || null,
        clubId,
        readStatus || null,
        search,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// GET /v1/books/discussed - Get books with discussion dates
const getDiscussedBooks = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const books = await db.Book.findAll({
      where: {
        clubId: parseInt(clubId),
        discussionDate: {
          [db.Op.ne]: null,
        },
      },
      include: [{
        model: db.User,
        as: "uploader",
        attributes: ["uid", "displayName"],
        required: false,
      }],
    });
    const bookIds = books.map((book) => book.id);
    const {likesByBookId, likedBookIds} = await buildLikesSummary(bookIds, userId);
    res.json(books.map((book) => ({
      id: book.id,
      ...book.toJSON(),
      likesCount: likesByBookId.get(book.id) || 0,
      isLiked: likedBookIds.has(book.id),
    })));
  } catch (e) {
    next(e);
  }
};

// GET /v1/books/filtered - Get books filtered by theme
const getFilteredBooks = async (req, res, next) => {
  try {
    const {
      theme,
      page = 1,
      pageSize = 10,
      orderBy = "created_at",
      orderDirection = "desc",
      userId,
      clubId,
      readStatus,
      search,
    } = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const mappedOrderBy = mapOrderByField(orderBy);
    const result = await getBooksPageFiltered(
        theme,
        parseInt(page),
        parseInt(pageSize),
        mappedOrderBy,
        orderDirection.toUpperCase(),
        userId || null,
        clubId,
        readStatus || null,
        search,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// GET /v1/books/:id - Get single book
const getBook = async (req, res, next) => {
  try {
    const {id} = req.params;
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const book = await db.Book.findOne({
      where: {id, clubId: parseInt(clubId)},
      include: [{
        model: db.User,
        as: "uploader",
        attributes: ["uid", "displayName"],
        required: false,
      }],
    });

    if (!book) {
      const error = new Error("Book not found");
      error.status = 404;
      throw error;
    }

    const {likesByBookId, likedBookIds} = await buildLikesSummary([book.id], req.query.userId);
    res.json({
      id: book.id,
      ...book.toJSON(),
      likesCount: likesByBookId.get(book.id) || 0,
      isLiked: likedBookIds.has(book.id),
    });
  } catch (e) {
    next(e);
  }
};

// POST /v1/books - Create new book
const createBook = async (req, res, next) => {
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
    const bookData = req.body;
    const book = await db.Book.create({
      ...bookData,
      clubId: parseInt(clubId),
      uploadedBy: userId,
      createdAt: new Date(),
    });
    res.status(201).json({id: book.id, ...book.toJSON()});
  } catch (e) {
    next(e);
  }
};

// PUT /v1/books/:id - Update book
const updateBook = async (req, res, next) => {
  try {
    const {id} = req.params;
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const updates = req.body;
    // Ensure clubId is not changed
    delete updates.clubId;
    delete updates.uploadedBy;
    delete updates.uploaded_by;

    await db.Book.update(updates, {where: {id, clubId: parseInt(clubId)}});
    const book = await db.Book.findByPk(id);
    if (!book || book.clubId !== parseInt(clubId)) {
      const error = new Error("Book not found");
      error.status = 404;
      throw error;
    }
    res.json({id: book.id, ...book.toJSON()});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/books/:id - Delete book
const deleteBook = async (req, res, next) => {
  try {
    const {id} = req.params;
    const {clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    await db.Book.destroy({where: {id, clubId: parseInt(clubId)}});
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// POST /v1/books/:id/like?clubId=...&userId=...
const addBookLike = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    const {id} = req.params;

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
    const numericBookId = parseInt(id);

    const membership = await verifyMembership(numericClubId, userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const book = await db.Book.findOne({
      where: {id: numericBookId, clubId: numericClubId},
      attributes: ["id"],
    });

    if (!book) {
      const error = new Error("Book not found in this club");
      error.status = 404;
      throw error;
    }

    const [like, created] = await db.BookLike.findOrCreate({
      where: {bookId: numericBookId, userId},
      defaults: {bookId: numericBookId, userId},
    });

    const likesCount = await db.BookLike.count({
      where: {bookId: numericBookId},
    });

    res.status(created ? 201 : 200).json({
      bookId: numericBookId,
      liked: true,
      likesCount,
      likeId: like.id,
    });
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/books/:id/like?clubId=...&userId=...
const removeBookLike = async (req, res, next) => {
  try {
    const {clubId, userId} = req.query;
    const {id} = req.params;

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
    const numericBookId = parseInt(id);

    const membership = await verifyMembership(numericClubId, userId);
    if (!membership) {
      const error = new Error("Club not found or user is not a member");
      error.status = 404;
      throw error;
    }

    const book = await db.Book.findOne({
      where: {id: numericBookId, clubId: numericClubId},
      attributes: ["id"],
    });

    if (!book) {
      const error = new Error("Book not found in this club");
      error.status = 404;
      throw error;
    }

    const deleted = await db.BookLike.destroy({
      where: {bookId: numericBookId, userId},
    });

    if (!deleted) {
      const error = new Error("Like not found");
      error.status = 404;
      throw error;
    }

    const likesCount = await db.BookLike.count({
      where: {bookId: numericBookId},
    });

    res.status(200).json({
      bookId: numericBookId,
      liked: false,
      likesCount,
    });
  } catch (e) {
    next(e);
  }
};

// GET /v1/books/progress - Get books with upcoming discussions and their progress
const getBooksProgress = async (req, res, next) => {
  try {
    const {bookId, page = 1, pageSize = 10, clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);

    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If bookId is provided, get progress for that specific book only
    if (bookId) {
      const bookIdInt = parseInt(bookId, 10);
      if (isNaN(bookIdInt)) {
        const error = new Error("Invalid book ID");
        error.status = 400;
        throw error;
      }

      const book = await db.Book.findOne({
        where: {id: bookIdInt, clubId: parseInt(clubId), chosenForBookclub: true},
      });
      if (!book) {
        const error = new Error("Book not found");
        error.status = 404;
        throw error;
      }

      // Calculate stats
      const statsData = await db.BookProgress.findAll({
        attributes: [
          "status",
          [db.sequelize.fn("COUNT", db.sequelize.col("BookProgress.id")), "count"],
          [db.sequelize.fn("AVG", db.sequelize.col("BookProgress.percent_complete")), "avgPercent"],
        ],
        where: {bookId: bookIdInt},
        group: ["status"],
      });

      // Calculate overall average percent, treating finished users as 100%
      const allProgress = await db.BookProgress.findAll({
        attributes: [
          "status",
          "percentComplete",
        ],
        where: {bookId: bookIdInt},
      });

      let activeReaders = 0;
      let finishedReaders = 0;
      let avgPercent = 0;
      let readerCount = 0;
      let totalPercent = 0;

      statsData.forEach((stat) => {
        const count = parseInt(stat.dataValues.count);
        readerCount += count;

        if (stat.status === "reading") {
          activeReaders = count;
        } else if (stat.status === "finished") {
          finishedReaders = count;
        }
      });

      // Calculate weighted average: finished users count as 100%
      allProgress.forEach((progress) => {
        if (progress.status === "finished") {
          totalPercent += 100;
        } else {
          totalPercent += parseFloat(progress.percentComplete || 0);
        }
      });

      if (readerCount > 0) {
        avgPercent = totalPercent / readerCount;
      }

      // Get paginated user progress
      const offset = (pageNum - 1) * pageSizeNum;
      const userProgress = await db.BookProgress.findAll({
        where: {
          bookId: bookIdInt,
          privacy: "public",
        },
        include: [{
          model: db.User,
          as: "user",
          attributes: ["uid", "displayName", "photoUrl"],
          required: true,
        }],
        order: [
          [db.sequelize.literal(
              `CASE WHEN status = 'finished' THEN 0 ` +
              `WHEN status = 'reading' THEN 1 ELSE 2 END`), "ASC"],
          [db.sequelize.literal("percent_complete"), "DESC"],
          [db.sequelize.literal("updated_at"), "DESC"],
        ],
        limit: pageSizeNum,
        offset,
      });

      const users = userProgress.map((progress) => ({
        userId: progress.userId,
        displayName: progress.user?.displayName || "Unknown User",
        photoUrl: progress.user?.photoUrl,
        status: progress.status,
        percentComplete: progress.percentComplete,
      }));

      return res.json({
        book: {
          id: book.id,
          title: book.title,
          author: book.author,
          coverImage: book.coverImage,
          discussionDate: book.discussionDate,
          stats: {
            activeReaders,
            finishedReaders,
            avgPercent: Math.round(avgPercent * 100) / 100,
            readerCount,
          },
          users,
        },
      });
    }

    // Get all books with discussionDate >= today, sorted by discussion date
    // For DATEONLY fields, Sequelize handles the date comparison automatically
    const books = await db.Book.findAll({
      where: {
        clubId: parseInt(clubId),
        chosenForBookclub: true,
        discussionDate: {
          [db.Op.gte]: today,
        },
      },
      order: [["discussion_date", "ASC"]],
    });

    // For each book, calculate stats and get first page of user progress
    const booksWithProgress = await Promise.allSettled(
        books.map(async (book) => {
          const bookId = book.id;

          try {
            // Calculate stats using aggregation
            const statsData = await db.BookProgress.findAll({
              attributes: [
                "status",
                [db.sequelize.fn("COUNT", db.sequelize.col("BookProgress.id")), "count"],
                [db.sequelize.fn("AVG",
                    db.sequelize.col("BookProgress.percent_complete")), "avgPercent"],
              ],
              where: {bookId},
              group: ["status"],
            });

            // Get all progress entries to calculate average with finished users as 100%
            const allProgress = await db.BookProgress.findAll({
              attributes: [
                "status",
                "percentComplete",
              ],
              where: {bookId},
            });

            let activeReaders = 0;
            let finishedReaders = 0;
            let avgPercent = 0;
            let readerCount = 0;
            let totalPercent = 0;

            statsData.forEach((stat) => {
              const count = parseInt(stat.dataValues.count);
              readerCount += count;

              if (stat.status === "reading") {
                activeReaders = count;
              } else if (stat.status === "finished") {
                finishedReaders = count;
              }
            });

            // Calculate weighted average: finished users count as 100%
            allProgress.forEach((progress) => {
              if (progress.status === "finished") {
                totalPercent += 100;
              } else {
                totalPercent += parseFloat(progress.percentComplete || 0);
              }
            });

            if (readerCount > 0) {
              avgPercent = totalPercent / readerCount;
            }

            // Get first page of user progress (10 users)
            const userProgress = await db.BookProgress.findAll({
              where: {
                bookId,
                privacy: "public",
              },
              include: [{
                model: db.User,
                as: "user",
                attributes: ["uid", "displayName", "photoUrl"],
                required: true,
              }],
              order: [
                [db.sequelize.literal(
                    `CASE WHEN status = 'finished' THEN 0 ` +
                    `WHEN status = 'reading' THEN 1 ELSE 2 END`), "ASC"],
                [db.sequelize.literal("percent_complete"), "DESC"],
                [db.sequelize.literal("updated_at"), "DESC"],
              ],
              limit: pageSizeNum,
              offset: 0,
            });

            const users = userProgress.map((progress) => ({
              userId: progress.userId,
              displayName: progress.user?.displayName || "Unknown User",
              photoUrl: progress.user?.photoUrl,
              status: progress.status,
              percentComplete: progress.percentComplete,
            }));

            return {
              id: book.id,
              title: book.title,
              author: book.author,
              coverImage: book.coverImage,
              discussionDate: book.discussionDate,
              stats: {
                activeReaders,
                finishedReaders,
                avgPercent: Math.round(avgPercent * 100) / 100,
                readerCount,
              },
              users: users || [],
            };
          } catch (err) {
            console.error(`Error processing book ${bookId}:`, err);
            // Return book with empty stats/users on error
            return {
              id: book.id,
              title: book.title,
              author: book.author,
              coverImage: book.coverImage,
              discussionDate: book.discussionDate,
              stats: {
                activeReaders: 0,
                finishedReaders: 0,
                avgPercent: 0,
                readerCount: 0,
              },
              users: [],
            };
          }
        }),
    );

    // Extract fulfilled results
    const successfulBooks = booksWithProgress
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value);

    res.json({books: successfulBooks});
  } catch (e) {
    next(e);
  }
};

// GET /v1/books/top-readers - Get top readers by finished books
const getTopReaders = async (req, res, next) => {
  try {
    const {limit = 10, clubId} = req.query;
    if (!clubId) {
      const error = new Error("clubId is required");
      error.status = 400;
      throw error;
    }
    const limitCount = parseInt(limit, 10);

    const results = await db.BookProgress.findAll({
      attributes: [
        "userId",
        [db.sequelize.fn("COUNT", db.sequelize.col("BookProgress.id")), "finishedCount"],
      ],
      where: {status: "finished"},
      group: [
        "userId",
        "user.uid",
        "user.display_name",
        "user.photo_url",
      ],
      order: [[db.sequelize.fn("COUNT", db.sequelize.col("BookProgress.id")), "DESC"]],
      limit: limitCount,
      include: [
        {
          model: db.User,
          as: "user",
          attributes: ["uid", "displayName", "photoUrl"],
          required: true,
        },
        {
          model: db.Book,
          as: "book",
          attributes: [], // Don't select any book attributes, just use for filtering
          where: {clubId: parseInt(clubId), chosenForBookclub: true},
          required: true,
        },
      ],
    });

    const leaderboard = results.map((result) => ({
      id: result.userId,
      finishedCount: parseInt(result.dataValues.finishedCount),
      displayName: result.user?.displayName || "Unknown User",
      photoUrl: result.user?.photoUrl,
    }));

    res.json(leaderboard);
  } catch (e) {
    next(e);
  }
};

module.exports = {
  getBooks,
  getDiscussedBooks,
  getFilteredBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  getBooksProgress,
  getTopReaders,
  addBookLike,
  removeBookLike,
};
