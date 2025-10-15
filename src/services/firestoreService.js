import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, setDoc, getDoc, query, orderBy, limit, startAfter, increment, where } from "firebase/firestore";
import { db } from '../firebase';

// Functions to interact with Firestore
export const getPosts = () => getDocs(collection(db, "posts"));
export const addPost = (post) => addDoc(collection(db, "posts"), post);

// Book management functions
export const getBooks = () => getDocs(collection(db, "books"));
export const addBook = async (book) => {
  const bookRef = await addDoc(collection(db, "books"), {
    ...book,
    createdAt: new Date()
  });
  
  // Update metadata count
  await updateBookMetadata(1);
  
  return bookRef;
};
export const updateBook = (bookId, updates) => updateDoc(doc(db, "books", bookId), updates);
export const deleteBook = async (bookId) => {
  await deleteDoc(doc(db, "books", bookId));
  
  // Update metadata count
  await updateBookMetadata(-1);
};

// Other collection functions
export const getMeetings = () => getDocs(collection(db, "meetings"));
export const getUserGoals = (userId) => getDocs(collection(db, `users/${userId}/user_goals`));
export const getGoalChecks = (userId, goalId) => getDocs(collection(db, `users/${userId}/user_goals/${goalId}/goal_checks`));

// Goals management functions
export const getGoals = (userId) => getDocs(collection(db, `users/${userId}/goals`));
export const addGoal = (userId, goal) => addDoc(collection(db, `users/${userId}/goals`), {
  ...goal,
  createdAt: new Date()
});
export const updateGoal = (userId, goalId, updates) => updateDoc(doc(db, `users/${userId}/goals`, goalId), updates);
export const deleteGoal = (userId, goalId) => deleteDoc(doc(db, `users/${userId}/goals`, goalId));

// Goal progress tracking functions
export const getGoalProgress = (userId, goalId) => getDocs(collection(db, `users/${userId}/goals/${goalId}/progress`));
export const addGoalProgress = (userId, goalId, progress) => addDoc(collection(db, `users/${userId}/goals/${goalId}/progress`), {
  ...progress,
  createdAt: new Date()
});

// User management functions
export const createUserDocument = async (user) => {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    // Create user document if it doesn't exist
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
  } else {
    // Update last login time for existing users
    await updateDoc(userRef, {
      lastLoginAt: new Date()
    });
  }
};

export const getUserDocument = (userId) => getDoc(doc(db, 'users', userId));

// Goal completion functions
export const checkGoalCompletion = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  const completionSnap = await getDoc(completionRef);
  return completionSnap.exists();
};

export const markGoalComplete = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  await setDoc(completionRef, {
    completed: true,
    completedAt: new Date()
  });
};

export const markGoalIncomplete = async (userId, goalId, periodId) => {
  const completionRef = doc(db, `users/${userId}/goals/${goalId}/completions`, periodId);
  await deleteDoc(completionRef);
};

export const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  const goalRef = doc(db, `users/${userId}/goals`, goalId);
  const goalSnap = await getDoc(goalRef);
  
  if (goalSnap.exists()) {
    const goalData = goalSnap.data();
    const updatedMilestones = [...goalData.milestones];
    updatedMilestones[milestoneIndex] = {
      ...updatedMilestones[milestoneIndex],
      completed: true,
      completedAt: new Date()
    };
    
    await updateDoc(goalRef, { milestones: updatedMilestones });
  }
};

export const markOneTimeGoalComplete = async (userId, goalId) => {
  const goalRef = doc(db, `users/${userId}/goals`, goalId);
  await updateDoc(goalRef, {
    completed: true,
    completedAt: new Date()
  });
};

// Book metadata and pagination functions
export const getBookMetadata = async () => {
  try {
    const metadataRef = doc(db, 'bookMetadata', 'stats');
    const metadataSnap = await getDoc(metadataRef);
    
    if (metadataSnap.exists()) {
      return metadataSnap.data();
    } else {
      // Initialize metadata if it doesn't exist
      const initialMetadata = {
        totalCount: 0,
        lastUpdated: new Date()
      };
      await setDoc(metadataRef, initialMetadata);
      return initialMetadata;
    }
  } catch (error) {
    console.error('Error getting book metadata:', error);
    return { totalCount: 0, lastUpdated: new Date() };
  }
};

export const updateBookMetadata = async (incrementBy = 1) => {
  try {
    const metadataRef = doc(db, 'bookMetadata', 'stats');
    await updateDoc(metadataRef, {
      totalCount: increment(incrementBy),
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error updating book metadata:', error);
  }
};

// Initialize metadata with actual book count (useful for first-time setup)
export const initializeBookMetadata = async () => {
  try {
    const booksRef = collection(db, 'books');
    const snapshot = await getDocs(booksRef);
    const actualCount = snapshot.docs.length;
    
    const metadataRef = doc(db, 'bookMetadata', 'stats');
    await setDoc(metadataRef, {
      totalCount: actualCount,
      lastUpdated: new Date()
    });
    
    return actualCount;
  } catch (error) {
    console.error('Error initializing book metadata:', error);
    return 0;
  }
};

export const getBooksPage = async (pageNumber = 1, pageSize = 10, orderByField = 'createdAt', orderDirection = 'desc') => {
  try {
    const booksRef = collection(db, 'books');
    const offset = (pageNumber - 1) * pageSize;
    
    // For now, we'll use a simple approach: get all books and slice
    // In a production app, you'd want to use startAfter for true pagination
    const q = query(
      booksRef,
      orderBy(orderByField, orderDirection)
    );
    
    const snapshot = await getDocs(q);
    const allBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get metadata for total count, but fallback to actual count if metadata is wrong
    const metadata = await getBookMetadata();
    const actualCount = allBooks.length;
    
    // Use the higher of metadata count or actual count to handle sync issues
    const totalCount = Math.max(metadata.totalCount, actualCount);
    
    // Slice for current page
    const startIndex = offset;
    const endIndex = startIndex + pageSize;
    const pageBooks = allBooks.slice(startIndex, endIndex);
    
    return {
      books: pageBooks,
      totalCount: totalCount
    };
  } catch (error) {
    console.error('Error fetching books page:', error);
    return { books: [], totalCount: 0 };
  }
};

// Get books filtered by theme with pagination
export const getBooksPageFiltered = async (theme, pageNumber = 1, pageSize = 10, orderByField = 'createdAt', orderDirection = 'desc') => {
  try {
    const booksRef = collection(db, 'books');
    const offset = (pageNumber - 1) * pageSize;
    
    let q;
    if (theme === 'no-theme') {
      // Get all books and filter client-side for empty theme array
      q = query(booksRef, orderBy(orderByField, orderDirection));
      const snapshot = await getDocs(q);
      const allBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const filtered = allBooks.filter(book => !book.theme || book.theme.length === 0);
      
      const totalCount = filtered.length;
      const pageBooks = filtered.slice(offset, offset + pageSize);
      
      return { books: pageBooks, totalCount };
    } else {
      // Use array-contains for specific theme
      q = query(
        booksRef,
        where('theme', 'array-contains', theme),
        orderBy(orderByField, orderDirection)
      );
      
      const snapshot = await getDocs(q);
      const allBooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const totalCount = allBooks.length;
      const pageBooks = allBooks.slice(offset, offset + pageSize);
      
      return { books: pageBooks, totalCount };
    }
  } catch (error) {
    console.error('Error fetching filtered books:', error);
    return { books: [], totalCount: 0 };
  }
};

// Book Progress Management Functions
export const getUserBookProgress = async (userId, bookId) => {
  try {
    const progressRef = doc(db, 'bookProgress', `${userId}_${bookId}`);
    const progressSnap = await getDoc(progressRef);
    
    if (progressSnap.exists()) {
      return { id: progressSnap.id, ...progressSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user book progress:', error);
    return null;
  }
};

export const getAllUserBookProgress = async (userId) => {
  try {
    const progressRef = collection(db, 'bookProgress');
    const q = query(progressRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all user book progress:', error);
    return [];
  }
};

export const updateUserBookProgress = async (userId, bookId, progressData) => {
  try {
    const progressRef = doc(db, 'bookProgress', `${userId}_${bookId}`);
    const progressSnap = await getDoc(progressRef);
    
    const updateData = {
      userId,
      bookId,
      ...progressData,
      updatedAt: new Date()
    };
    
    if (progressSnap.exists()) {
      // Update existing progress
      await updateDoc(progressRef, updateData);
    } else {
      // Create new progress record
      await setDoc(progressRef, updateData);
    }
    
    return { id: progressRef.id, ...updateData };
  } catch (error) {
    console.error('Error updating user book progress:', error);
    throw error;
  }
};

export const getAllUsersProgressForBook = async (bookId) => {
  try {
    const progressRef = collection(db, 'bookProgress');
    const q = query(
      progressRef,
      where('bookId', '==', bookId),
      where('privacy', '==', 'public')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all users progress for book:', error);
    return [];
  }
};

export const deleteUserBookProgress = async (userId, bookId) => {
  try {
    const progressRef = doc(db, 'bookProgress', `${userId}_${bookId}`);
    await deleteDoc(progressRef);
  } catch (error) {
    console.error('Error deleting user book progress:', error);
    throw error;
  }
};

// User Stats Functions
export const getUserStats = async (userId) => {
  try {
    console.log('🔍 Getting user stats for:', userId);
    const userStatsRef = doc(db, 'userStats', userId);
    const userStatsSnap = await getDoc(userStatsRef);
    
    console.log('📊 User stats result:', {
      exists: userStatsSnap.exists(),
      data: userStatsSnap.exists() ? { id: userStatsSnap.id, ...userStatsSnap.data() } : null
    });
    
    if (userStatsSnap.exists()) {
      return { id: userStatsSnap.id, ...userStatsSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('❌ Error getting user stats:', error);
    return null;
  }
};

export const getTopFinishedBooksUsers = async (limitCount = 10) => {
  try {
    console.log('🔍 Querying userStats collection...');
    const userStatsRef = collection(db, 'userStats');
    const q = query(
      userStatsRef,
      orderBy('finishedCount', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    
    console.log('📊 Query result:', {
      docsCount: snapshot.docs.length,
      docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('❌ Error getting top finished books users:', error);
    return [];
  }
};

// Book Stats Functions
export const getBookStats = async (bookId) => {
  try {
    const bookStatsRef = doc(db, 'bookStats', bookId);
    const bookStatsSnap = await getDoc(bookStatsRef);
    
    if (bookStatsSnap.exists()) {
      return { id: bookStatsSnap.id, ...bookStatsSnap.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting book stats:', error);
    return null;
  }
};

// Get all users (for leaderboard and other purposes)
export const getAllUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
};
