// Firestore service implementation (extracted from existing logic)
const {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  query,
  orderBy,
  limit,
  increment,
  where,
} = require("firebase/firestore");
const {getFirestore} = require("firebase-admin/firestore");

const db = getFirestore();

// Functions to interact with Firestore
const getPosts = () => getDocs(collection(db, "posts"));
const addPost = (post) => addDoc(collection(db, "posts"), post);

// Book management functions
const getBooks = () => getDocs(collection(db, "books"));
const addBook = async (book) => {
  const bookRef = await addDoc(collection(db, "books"), {
    ...book,
    createdAt: new Date(),
  });

  // Update metadata count
  await updateBookMetadata(1);

  return bookRef;
};
const updateBook = (bookId, updates) => updateDoc(doc(db, "books", bookId), updates);
const deleteBook = async (bookId) => {
  await deleteDoc(doc(db, "books", bookId));

  // Update metadata count
  await updateBookMetadata(-1);
};

// Other collection functions
const getMeetings = () => getDocs(collection(db, "meetings"));

// Goals management functions
const getGoals = (userId) => getDocs(collection(db, `users/${userId}/goals`));
const addGoal = (userId, goal) => addDoc(collection(db, `users/${userId}/goals`), {
  ...goal,
  createdAt: new Date(),
});
const updateGoal = (userId, goalId, updates) =>
  updateDoc(doc(db, `users/${userId}/goals`, goalId), updates);
const deleteGoal = (userId, goalId) => deleteDoc(doc(db, `users/${userId}/goals`, goalId));

// Goal progress tracking functions
const getGoalProgress = (userId, goalId) =>
  getDocs(collection(db, `users/${userId}/goals/${goalId}/progress`));
const addGoalProgress = (userId, goalId, progress) =>
  addDoc(collection(db, `users/${userId}/goals/${goalId}/progress`), {
    ...progress,
    createdAt: new Date(),
  });

// User management functions
const createUserDocument = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    // Create user document if it doesn't exist
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });
  } else {
    // Update last login time for existing users
    await updateDoc(userRef, {
      lastLoginAt: new Date(),
    });
  }
};

const getUserDocument = (userId) => getDoc(doc(db, "users", userId));

// Goal completion functions
const checkGoalCompletion = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  const completionSnap = await getDoc(completionRef);
  return completionSnap.exists();
};

const markGoalComplete = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  await setDoc(completionRef, {
    completed: true,
    completedAt: new Date(),
  });
};

const markGoalIncomplete = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  await deleteDoc(completionRef);
};

const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  const goalRef = doc(db, `users/${userId}/goals`, goalId);
  const goalSnap = await getDoc(goalRef);

  if (goalSnap.exists()) {
    const goalData = goalSnap.data();
    const updatedMilestones = [...goalData.milestones];
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: true,
      completedAt: new Date(),
    };

    await updateDoc(goalRef, {milestones: updatedMilestones});
  }
};

const markOneTimeGoalComplete = async (userId, goalId) => {
  const goalRef = doc(db, `users/${userId}/goals`, goalId);
  await updateDoc(goalRef, {
    completed: true,
    completedAt: new Date(),
  });
};

// Book metadata and pagination functions
const getBookMetadata = async () => {
  try {
    const metadataRef = doc(db, "bookMetadata", "stats");
    const metadataSnap = await getDoc(metadataRef);

    if (metadataSnap.exists()) {
      return metadataSnap.data();
    } else {
      // Initialize metadata if it doesn't exist
      const initialMetadata = {
        totalCount: 0,
        lastUpdated: new Date(),
      };
      await setDoc(metadataRef, initialMetadata);
      return initialMetadata;
    }
  } catch (error) {
    return {totalCount: 0, lastUpdated: new Date()};
  }
};

const updateBookMetadata = async (incrementBy = 1) => {
  try {
    const metadataRef = doc(db, "bookMetadata", "stats");
    await updateDoc(metadataRef, {
      totalCount: increment(incrementBy),
      lastUpdated: new Date(),
    });
  } catch (error) {
    // Error updating book metadata
  }
};

// Initialize metadata with actual book count (useful for first-time setup)
const initializeBookMetadata = async () => {
  try {
    const booksRef = collection(db, "books");
    const snapshot = await getDocs(booksRef);
    const actualCount = snapshot.docs.length;

    const metadataRef = doc(db, "bookMetadata", "stats");
    await setDoc(metadataRef, {
      totalCount: actualCount,
      lastUpdated: new Date(),
    });

    return actualCount;
  } catch (error) {
    return 0;
  }
};

const getBooksPage = async (
    pageNumber = 1,
    pageSize = 10,
    orderByField = "createdAt",
    orderDirection = "desc",
    userId = null,
) => {
  try {
    const booksRef = collection(db, "books");
    const offset = (pageNumber - 1) * pageSize;

    // For now, we'll use a simple approach: get all books and slice
    // In a production app, you'd want to use startAfter for true pagination
    const q = query(
        booksRef,
        orderBy(orderByField, orderDirection),
    );

    const snapshot = await getDocs(q);
    const allBooks = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

    // Get metadata for total count, but fallback to actual count if metadata is wrong
    const metadata = await getBookMetadata();
    const actualCount = allBooks.length;

    // Use the higher of metadata count or actual count to handle sync issues
    const totalCount = Math.max(metadata.totalCount, actualCount);

    // Slice for current page
    const startIndex = offset;
    const endIndex = startIndex + pageSize;
    const pageBooks = allBooks.slice(startIndex, endIndex);

    // If userId is provided, fetch and attach progress data
    if (userId) {
      const allProgress = await getAllUserBookProgress(userId);
      const progressMap = {};
      allProgress.forEach((progress) => {
        progressMap[progress.bookId] = progress;
      });

      // Attach progress to each book
      pageBooks.forEach((book) => {
        book.progress = progressMap[book.id] || null;
      });
    }

    return {
      books: pageBooks,
      totalCount: totalCount,
    };
  } catch (error) {
    return {books: [], totalCount: 0};
  }
};

// Get books filtered by theme with pagination
const getBooksPageFiltered = async (
    theme,
    pageNumber = 1,
    pageSize = 10,
    orderByField = "createdAt",
    orderDirection = "desc",
    userId = null,
) => {
  try {
    const booksRef = collection(db, "books");
    const offset = (pageNumber - 1) * pageSize;

    let q;
    let pageBooks;
    let totalCount;
    if (theme === "no-theme") {
      // Get all books and filter client-side for empty theme array
      q = query(booksRef, orderBy(orderByField, orderDirection));
      const snapshot = await getDocs(q);
      const allBooks = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
      const filtered = allBooks.filter((book) => !book.theme || book.theme.length === 0);

      totalCount = filtered.length;
      pageBooks = filtered.slice(offset, offset + pageSize);
    } else {
      // Use array-contains for specific theme
      q = query(
          booksRef,
          where("theme", "array-contains", theme),
          orderBy(orderByField, orderDirection),
      );

      const snapshot = await getDocs(q);
      const allBooks = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));

      totalCount = allBooks.length;
      pageBooks = allBooks.slice(offset, offset + pageSize);
    }

    // If userId is provided, fetch and attach progress data
    if (userId) {
      const allProgress = await getAllUserBookProgress(userId);
      const progressMap = {};
      allProgress.forEach((progress) => {
        progressMap[progress.bookId] = progress;
      });

      // Attach progress to each book
      pageBooks.forEach((book) => {
        book.progress = progressMap[book.id] || null;
      });
    }

    return {books: pageBooks, totalCount};
  } catch (error) {
    return {books: [], totalCount: 0};
  }
};

// Book Progress Management Functions
const getUserBookProgress = async (userId, bookId) => {
  try {
    const progressRef = doc(db, "bookProgress", `${userId}_${bookId}`);
    const progressSnap = await getDoc(progressRef);

    if (progressSnap.exists()) {
      return {id: progressSnap.id, ...progressSnap.data()};
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getAllUserBookProgress = async (userId) => {
  try {
    const progressRef = collection(db, "bookProgress");
    const q = query(progressRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
  } catch (error) {
    return [];
  }
};

const updateUserBookProgress = async (userId, bookId, progressData) => {
  const progressRef = doc(db, "bookProgress", `${userId}_${bookId}`);
  const progressSnap = await getDoc(progressRef);

  const updateData = {
    userId,
    bookId,
    ...progressData,
    updatedAt: new Date(),
  };

  if (progressSnap.exists()) {
    // Update existing progress
    await updateDoc(progressRef, updateData);
  } else {
    // Create new progress record
    await setDoc(progressRef, updateData);
  }

  return {id: progressRef.id, ...updateData};
};

const getAllUsersProgressForBook = async (bookId) => {
  try {
    const progressRef = collection(db, "bookProgress");
    const q = query(
        progressRef,
        where("bookId", "==", bookId),
        where("privacy", "==", "public"),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
  } catch (error) {
    return [];
  }
};

const deleteUserBookProgress = async (userId, bookId) => {
  const progressRef = doc(db, "bookProgress", `${userId}_${bookId}`);
  await deleteDoc(progressRef);
};

// User Stats Functions
const getUserStats = async (userId) => {
  try {
    const userStatsRef = doc(db, "userStats", userId);
    const userStatsSnap = await getDoc(userStatsRef);

    if (userStatsSnap.exists()) {
      return {id: userStatsSnap.id, ...userStatsSnap.data()};
    }
    return null;
  } catch (error) {
    return null;
  }
};

const getTopFinishedBooksUsers = async (limitCount = 10) => {
  try {
    const userStatsRef = collection(db, "userStats");
    const q = query(
        userStatsRef,
        orderBy("finishedCount", "desc"),
        limit(limitCount),
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
  } catch (error) {
    return [];
  }
};

// Book Stats Functions
const getBookStats = async (bookId) => {
  try {
    const bookStatsRef = doc(db, "bookStats", bookId);
    const bookStatsSnap = await getDoc(bookStatsRef);

    if (bookStatsSnap.exists()) {
      return {id: bookStatsSnap.id, ...bookStatsSnap.data()};
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Get all users (for leaderboard and other purposes)
const getAllUsers = async () => {
  try {
    const usersRef = collection(db, "users");
    const snapshot = await getDocs(usersRef);

    return snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
  } catch (error) {
    return [];
  }
};

// Get all books with discussion dates (for "discussed" filter)
const getAllDiscussedBooks = async () => {
  try {
    const booksRef = collection(db, "books");
    const snapshot = await getDocs(booksRef);

    const allBooks = snapshot.docs.map((doc) => ({id: doc.id, ...doc.data()}));
    const discussedBooks = allBooks.filter((book) => book.discussionDate);

    return discussedBooks;
  } catch (error) {
    return [];
  }
};

module.exports = {
  // Posts
  getPosts,
  addPost,

  // Books
  getBooks,
  addBook,
  updateBook,
  deleteBook,
  getBooksPage,
  getBooksPageFiltered,
  getAllDiscussedBooks,
  getBookMetadata,
  updateBookMetadata,
  initializeBookMetadata,

  // Meetings
  getMeetings,

  // Goals
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  getGoalProgress,
  addGoalProgress,
  checkGoalCompletion,
  markGoalComplete,
  markGoalIncomplete,
  markMilestoneComplete,
  markOneTimeGoalComplete,

  // Users
  createUserDocument,
  getUserDocument,
  getAllUsers,

  // Progress
  getUserBookProgress,
  getAllUserBookProgress,
  updateUserBookProgress,
  getAllUsersProgressForBook,
  deleteUserBookProgress,

  // Stats
  getUserStats,
  getTopFinishedBooksUsers,
  getBookStats,
};
