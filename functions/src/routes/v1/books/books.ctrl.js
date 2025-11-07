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
  };
  return fieldMap[field] || field;
};

// Helper function to get books page
const getBooksPage = async (pageNumber, pageSize, orderByField, orderDirection, userId) => {
  const offset = (pageNumber - 1) * pageSize;

  const includeOptions = [];
  if (userId) {
    includeOptions.push({
      model: db.BookProgress,
      as: "bookProgresses",
      where: {userId},
      required: false,
      attributes: ["id", "userId", "bookId", "status", "percentComplete", "privacy", "updatedAt"],
    });
  }

  const queryOptions = {
    order: [[orderByField, orderDirection]],
    limit: pageSize,
    offset,
  };

  if (includeOptions.length > 0) {
    queryOptions.include = includeOptions;
  }

  const {count, rows} = await db.Book.findAndCountAll(queryOptions);

  return {
    books: rows.map((book) => {
      const bookData = book.toJSON();
      // Set progress to first element of bookProgresses array if present
      bookData.progress = bookData.bookProgresses && bookData.bookProgresses.length > 0 ?
        bookData.bookProgresses[0] : null;
      return {
        id: book.id,
        ...bookData,
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
) => {
  const offset = (pageNumber - 1) * pageSize;
  let whereClause = {};

  if (theme === "no-theme") {
    whereClause = {
      [db.Op.or]: [
        {theme: null},
        {theme: []},
      ],
    };
  } else if (theme !== "all") {
    whereClause = {
      theme: {
        [db.Op.contains]: [theme],
      },
    };
  }

  const includeOptions = [];
  if (userId) {
    includeOptions.push({
      model: db.BookProgress,
      as: "bookProgresses",
      where: {userId},
      required: false,
      attributes: ["id", "userId", "bookId", "status", "percentComplete", "privacy", "updatedAt"],
    });
  }

  const queryOptions = {
    where: whereClause,
    order: [[orderByField, orderDirection]],
    limit: pageSize,
    offset,
  };

  if (includeOptions.length > 0) {
    queryOptions.include = includeOptions;
  }

  const {count, rows} = await db.Book.findAndCountAll(queryOptions);

  return {
    books: rows.map((book) => {
      const bookData = book.toJSON();
      // Set progress to first element of bookProgresses array if present
      bookData.progress = bookData.bookProgresses && bookData.bookProgresses.length > 0 ?
        bookData.bookProgresses[0] : null;
      return {
        id: book.id,
        ...bookData,
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
    } = req.query;
    const mappedOrderBy = mapOrderByField(orderBy);
    const result = await getBooksPage(
        parseInt(page),
        parseInt(pageSize),
        mappedOrderBy,
        orderDirection.toUpperCase(),
        userId || null,
    );
    res.json(result);
  } catch (e) {
    next(e);
  }
};

// GET /v1/books/discussed - Get books with discussion dates
const getDiscussedBooks = async (req, res, next) => {
  try {
    const books = await db.Book.findAll({
      where: {
        discussionDate: {
          [db.Op.ne]: null,
        },
      },
    });
    res.json(books.map((book) => ({id: book.id, ...book.toJSON()})));
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
    } = req.query;
    const mappedOrderBy = mapOrderByField(orderBy);
    const result = await getBooksPageFiltered(
        theme,
        parseInt(page),
        parseInt(pageSize),
        mappedOrderBy,
        orderDirection.toUpperCase(),
        userId || null,
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
    const book = await db.Book.findByPk(id);

    if (!book) {
      const error = new Error("Book not found");
      error.status = 404;
      throw error;
    }

    res.json({id: book.id, ...book.toJSON()});
  } catch (e) {
    next(e);
  }
};

// POST /v1/books - Create new book
const createBook = async (req, res, next) => {
  try {
    const bookData = req.body;
    const book = await db.Book.create({
      ...bookData,
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
    const updates = req.body;

    await db.Book.update(updates, {where: {id}});
    const book = await db.Book.findByPk(id);
    res.json({id: book.id, ...book.toJSON()});
  } catch (e) {
    next(e);
  }
};

// DELETE /v1/books/:id - Delete book
const deleteBook = async (req, res, next) => {
  try {
    const {id} = req.params;
    await db.Book.destroy({where: {id}});
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};

// GET /v1/books/progress - Get books with upcoming discussions and their progress
const getBooksProgress = async (req, res, next) => {
  try {
    const {bookId, page = 1, pageSize = 10} = req.query;
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

      const book = await db.Book.findByPk(bookIdInt);
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

      let activeReaders = 0;
      let finishedReaders = 0;
      let avgPercent = 0;
      let readerCount = 0;

      statsData.forEach((stat) => {
        const count = parseInt(stat.dataValues.count);
        readerCount += count;

        if (stat.status === "reading") {
          activeReaders = count;
        } else if (stat.status === "finished") {
          finishedReaders = count;
        }

        if (stat.dataValues.avgPercent) {
          avgPercent = parseFloat(stat.dataValues.avgPercent);
        }
      });

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
          [db.sequelize.literal(`CASE WHEN status = 'finished' THEN 0 WHEN status = 'reading' THEN 1 ELSE 2 END`), "ASC"],
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
                [db.sequelize.fn("AVG", db.sequelize.col("BookProgress.percent_complete")), "avgPercent"],
              ],
              where: {bookId},
              group: ["status"],
            });

            let activeReaders = 0;
            let finishedReaders = 0;
            let avgPercent = 0;
            let readerCount = 0;

            statsData.forEach((stat) => {
              const count = parseInt(stat.dataValues.count);
              readerCount += count;

              if (stat.status === "reading") {
                activeReaders = count;
              } else if (stat.status === "finished") {
                finishedReaders = count;
              }

              if (stat.dataValues.avgPercent) {
                avgPercent = parseFloat(stat.dataValues.avgPercent);
              }
            });

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
                [db.sequelize.literal(`CASE WHEN status = 'finished' THEN 0 WHEN status = 'reading' THEN 1 ELSE 2 END`), "ASC"],
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
    const {limit = 10} = req.query;
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
      include: [{
        model: db.User,
        as: "user",
        attributes: ["uid", "displayName", "photoUrl"],
        required: true,
      }],
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
};

