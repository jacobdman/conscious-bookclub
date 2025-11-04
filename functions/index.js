require("dotenv").config();
const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Create Express app for API
const app = express();
// CORS: Allow all origins (including localhost for emulator)
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Import route handlers
const booksRouter = require("./routes/books");
const goalsRouter = require("./routes/goals");
const postsRouter = require("./routes/posts");
const usersRouter = require("./routes/users");
const progressRouter = require("./routes/progress");
const statsRouter = require("./routes/stats");
const meetingsRouter = require("./routes/meetings");

// Initialize database if using PostgreSQL
if (process.env.USE_POSTGRES === "true") {
  const postgresService = require("./services/postgresService");
  postgresService.initializeDatabase().catch(console.error);
}

// Mount all v1 routes
const v1Router = new express.Router();
v1Router.use("/books", booksRouter);
v1Router.use("/goals", goalsRouter);
v1Router.use("/posts", postsRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/progress", progressRouter);
v1Router.use("/stats", statsRouter);
v1Router.use("/meetings", meetingsRouter);

app.use("/v1", v1Router);

// Health check endpoint
app.get("/health", async (req, res) => {
  const usePostgres = process.env.USE_POSTGRES === "true";
  const healthStatus = {
    status: "OK",
    timestamp: new Date().toISOString(),
    database: "unknown",
    usePostgres: usePostgres,
  };

  try {
    if (usePostgres) {
      // Test PostgreSQL connection via Sequelize
      const postgresService = require("./services/postgresService");
      await postgresService.initializeDatabase();
      healthStatus.database = "postgresql_connected";
    } else {
      // Test Firestore connection
      const testCollection = db.collection("health_check");
      await testCollection.limit(1).get();
      healthStatus.database = "firestore_connected";
    }

    res.json(healthStatus);
  } catch (error) {
    console.error("Health check failed:", error);
    healthStatus.status = "ERROR";
    healthStatus.database = "connection_failed";
    healthStatus.error = error.message;
    res.status(500).json(healthStatus);
  }
});

// Export the API function
exports.api = onRequest(app);

exports.getHealth = onRequest(async (req, res) => {
  const dbIsHealthy = await db.collection("users").get();
  if (dbIsHealthy.empty) {
    res.status(500).send("DB is not healthy");
  }
  res.send("OK");
});

/**
 * Cloud Function to maintain userStats and bookStats when bookProgress changes
 */
exports.maintainBookProgressStats = onDocumentWritten(
    "bookProgress/{progressId}",
    async (event) => {
      const before = event.data?.before?.data();
      const after = event.data?.after?.data();

      // Handle document deletion
      if (!after) {
        if (before) {
          await handleProgressDeletion(before);
        }
        return;
      }

      // Handle document creation or update
      if (!before) {
        // New document - just update stats based on current state
        await updateStatsForProgress(after);
      } else {
        // Update - check for status transitions
        const beforeStatus = before.status;
        const afterStatus = after.status;

        if (beforeStatus !== afterStatus) {
          await handleStatusTransition(before, after);
        }

        // Always update book stats for percent changes
        await updateBookStats(after);
      }
    });

/**
 * Handle progress document deletion
 * @param {Object} progressData - The deleted progress document data
 */
async function handleProgressDeletion(progressData) {
  const {userId, status} = progressData;

  // Decrement counters based on the status being deleted
  if (status === "finished") {
    const userStatsRef = db.collection("userStats").doc(userId);
    await userStatsRef.update({
      finishedCount: FieldValue.increment(-1),
    });
  }

  // Update book stats
  await updateBookStatsForDeletion(progressData);
}

/**
 * Handle status transitions between not_started, reading, and finished
 * @param {Object} before - The previous progress document data
 * @param {Object} after - The new progress document data
 */
async function handleStatusTransition(before, after) {
  const {userId} = after;
  const beforeStatus = before.status;
  const afterStatus = after.status;

  // Update user stats for finished count
  if (beforeStatus === "finished" && afterStatus !== "finished") {
    // Moving away from finished
    const userStatsRef = db.collection("userStats").doc(userId);
    await userStatsRef.update({
      finishedCount: FieldValue.increment(-1),
    });
  } else if (beforeStatus !== "finished" && afterStatus === "finished") {
    // Moving to finished
    const userStatsRef = db.collection("userStats").doc(userId);
    await userStatsRef.update({
      finishedCount: FieldValue.increment(1),
      lastFinishedAt: FieldValue.serverTimestamp(),
    });
  }

  // Update book stats for active/finished reader counts
  await updateBookStatsForStatusChange(before, after);
}

/**
 * Update stats for new progress document
 * @param {Object} progressData - The new progress document data
 */
async function updateStatsForProgress(progressData) {
  const {userId, status} = progressData;

  // Initialize user stats if needed
  await initializeUserStats(userId);

  // Update user stats based on status
  if (status === "finished") {
    const userStatsRef = db.collection("userStats").doc(userId);
    await userStatsRef.update({
      finishedCount: FieldValue.increment(1),
      lastFinishedAt: FieldValue.serverTimestamp(),
    });
  }

  // Update book stats
  await updateBookStats(progressData);
}

/**
 * Initialize user stats document if it doesn't exist
 * @param {string} userId - The user ID
 */
async function initializeUserStats(userId) {
  const userStatsRef = db.collection("userStats").doc(userId);
  const userStatsDoc = await userStatsRef.get();

  if (!userStatsDoc.exists) {
    // Get user data from users collection
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};

    await userStatsRef.set({
      userId,
      finishedCount: 0,
      displayName: userData.displayName || "Unknown User",
      photoURL: userData.photoURL || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

/**
 * Update book stats for a progress change
 * @param {Object} progressData - The progress document data
 */
async function updateBookStats(progressData) {
  const {bookId} = progressData;
  const bookStatsRef = db.collection("bookStats").doc(bookId);

  // Initialize book stats if needed
  const bookStatsDoc = await bookStatsRef.get();
  if (!bookStatsDoc.exists) {
    await bookStatsRef.set({
      bookId,
      activeReaders: 0,
      finishedReaders: 0,
      sumPercent: 0,
      readerCount: 0,
      avgPercent: 0,
    });
  }

  // Recalculate book stats by querying all progress for this book
  await recalculateBookStats(bookId);
}

/**
 * Update book stats for status changes
 * @param {Object} before - The previous progress document data
 * @param {Object} after - The new progress document data
 */
async function updateBookStatsForStatusChange(before, after) {
  const {bookId} = after;
  const beforeStatus = before.status;
  const afterStatus = after.status;

  const bookStatsRef = db.collection("bookStats").doc(bookId);

  // Update active readers count
  if (beforeStatus === "reading" && afterStatus !== "reading") {
    await bookStatsRef.update({
      activeReaders: FieldValue.increment(-1),
    });
  } else if (beforeStatus !== "reading" && afterStatus === "reading") {
    await bookStatsRef.update({
      activeReaders: FieldValue.increment(1),
    });
  }

  // Update finished readers count
  if (beforeStatus === "finished" && afterStatus !== "finished") {
    await bookStatsRef.update({
      finishedReaders: FieldValue.increment(-1),
    });
  } else if (beforeStatus !== "finished" && afterStatus === "finished") {
    await bookStatsRef.update({
      finishedReaders: FieldValue.increment(1),
    });
  }

  // Recalculate average percentage
  await recalculateBookStats(bookId);
}

/**
 * Update book stats for progress deletion
 * @param {Object} progressData - The deleted progress document data
 */
async function updateBookStatsForDeletion(progressData) {
  const {bookId, status} = progressData;
  const bookStatsRef = db.collection("bookStats").doc(bookId);

  // Decrement appropriate counters
  if (status === "reading") {
    await bookStatsRef.update({
      activeReaders: FieldValue.increment(-1),
    });
  } else if (status === "finished") {
    await bookStatsRef.update({
      finishedReaders: FieldValue.increment(-1),
    });
  }

  // Recalculate stats
  await recalculateBookStats(bookId);
}

/**
 * Recalculate all book stats by querying all progress for the book
 * @param {string} bookId - The book ID
 */
async function recalculateBookStats(bookId) {
  const bookStatsRef = db.collection("bookStats").doc(bookId);

  // Get all progress for this book
  const progressSnapshot = await db.collection("bookProgress")
      .where("bookId", "==", bookId)
      .get();

  let activeReaders = 0;
  let finishedReaders = 0;
  let sumPercent = 0;
  let readerCount = 0;

  progressSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    readerCount++;
    sumPercent += data.percentComplete || 0;

    if (data.status === "reading") {
      activeReaders++;
    } else if (data.status === "finished") {
      finishedReaders++;
    }
  });

  const avgPercent = readerCount > 0 ? sumPercent / readerCount : 0;

  await bookStatsRef.update({
    activeReaders,
    finishedReaders,
    sumPercent,
    readerCount,
    avgPercent: Math.round(avgPercent * 100) / 100, // Round to 2 decimal places
  });
}
