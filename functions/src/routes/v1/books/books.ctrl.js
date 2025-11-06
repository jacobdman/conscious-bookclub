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

module.exports = {
  getBooks,
  getDiscussedBooks,
  getFilteredBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
};

