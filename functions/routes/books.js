const express = require("express");
// eslint-disable-next-line new-cap
const router = express.Router();
const dbService = require("../services/databaseService");

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

// GET /v1/books - Get all books with pagination
router.get("/", async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      orderBy = "created_at",
      orderDirection = "desc",
      userId,
    } = req.query;
    const mappedOrderBy = mapOrderByField(orderBy);
    const result = await dbService.getBooksPage(
        parseInt(page),
        parseInt(pageSize),
        mappedOrderBy,
        orderDirection.toUpperCase(),
        userId || null,
    );
    res.json(result);
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({error: "Failed to fetch books"});
  }
});

// GET /v1/books/discussed - Get books with discussion dates
router.get("/discussed", async (req, res) => {
  try {
    const books = await dbService.getAllDiscussedBooks();
    res.json(books);
  } catch (error) {
    console.error("Error fetching discussed books:", error);
    res.status(500).json({error: "Failed to fetch discussed books"});
  }
});

// GET /v1/books/filtered - Get books filtered by theme
router.get("/filtered", async (req, res) => {
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
    const result = await dbService.getBooksPageFiltered(
        theme,
        parseInt(page),
        parseInt(pageSize),
        mappedOrderBy,
        orderDirection.toUpperCase(),
        userId || null,
    );
    res.json(result);
  } catch (error) {
    console.error("Error fetching filtered books:", error);
    res.status(500).json({error: "Failed to fetch filtered books"});
  }
});

// GET /v1/books/:id - Get single book
router.get("/:id", async (req, res) => {
  try {
    const books = await dbService.getBooks();
    const book = books.docs.find((doc) => doc.id === req.params.id);

    if (!book) {
      return res.status(404).json({error: "Book not found"});
    }

    res.json({id: book.id, ...book.data()});
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({error: "Failed to fetch book"});
  }
});

// POST /v1/books - Create new book
router.post("/", async (req, res) => {
  try {
    const bookData = req.body;
    const result = await dbService.addBook(bookData);
    res.status(201).json({id: result.id, ...bookData});
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({error: "Failed to create book"});
  }
});

// PUT /v1/books/:id - Update book
router.put("/:id", async (req, res) => {
  try {
    const {id} = req.params;
    const updates = req.body;

    await dbService.updateBook(id, updates);
    res.json({id, ...updates});
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({error: "Failed to update book"});
  }
});

// DELETE /v1/books/:id - Delete book
router.delete("/:id", async (req, res) => {
  try {
    const {id} = req.params;
    await dbService.deleteBook(id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({error: "Failed to delete book"});
  }
});

module.exports = router;
