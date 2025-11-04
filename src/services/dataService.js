// Data service with feature toggle between Firestore and API
// Determine API base URL based on environment
const getApiBase = () => {
  // Check if we're in development
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Use local emulator URL
    return 'http://localhost:5001/conscious-bookclub-87073-9eb71/us-central1/api';
  }
  
  // Production: use actual Firebase Functions URL
  return 'https://us-central1-conscious-bookclub-87073-9eb71.cloudfunctions.net/api';
};

const API_BASE = getApiBase();
const USE_POSTGRES = process.env.REACT_APP_USE_POSTGRES === 'true';

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }

  // Handle 204 No Content responses
  if (response.status === 204) {
    return null;
  }

  return response.json();
};

// Posts functions
export const getPosts = async () => {
  if (USE_POSTGRES) {
    const posts = await apiCall('/v1/posts');
    return { docs: posts.map(post => ({ id: post.id, data: () => post })) };
  } else {
    // Import Firestore functions dynamically to avoid issues when USE_POSTGRES is true
    const { getPosts: getPostsFirestore } = await import('./firestoreService');
    return getPostsFirestore();
  }
};

export const addPost = async (post) => {
  if (USE_POSTGRES) {
    const result = await apiCall('/v1/posts', {
      method: 'POST',
      body: JSON.stringify(post),
    });
    return { id: result.id };
  } else {
    const { addPost: addPostFirestore } = await import('./firestoreService');
    return addPostFirestore(post);
  }
};

// Books functions
export const getBooks = async () => {
  if (USE_POSTGRES) {
    const result = await apiCall('/v1/books');
    return { docs: result.books.map(book => ({ id: book.id, data: () => book })) };
  } else {
    const { getBooks: getBooksFirestore } = await import('./firestoreService');
    return getBooksFirestore();
  }
};

export const addBook = async (book) => {
  if (USE_POSTGRES) {
    const result = await apiCall('/v1/books', {
      method: 'POST',
      body: JSON.stringify(book),
    });
    return { id: result.id };
  } else {
    const { addBook: addBookFirestore } = await import('./firestoreService');
    return addBookFirestore(book);
  }
};

export const updateBook = async (bookId, updates) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/books/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } else {
    const { updateBook: updateBookFirestore } = await import('./firestoreService');
    return updateBookFirestore(bookId, updates);
  }
};

export const deleteBook = async (bookId) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/books/${bookId}`, {
      method: 'DELETE',
    });
  } else {
    const { deleteBook: deleteBookFirestore } = await import('./firestoreService');
    return deleteBookFirestore(bookId);
  }
};

export const getBooksPage = async (pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
  if (USE_POSTGRES) {
    const params = new URLSearchParams({
      page: pageNumber.toString(),
      pageSize: pageSize.toString(),
      orderBy: orderByField,
      orderDirection,
    });
    if (userId) {
      params.append('userId', userId);
    }
    return apiCall(`/v1/books?${params}`);
  } else {
    const { getBooksPage: getBooksPageFirestore } = await import('./firestoreService');
    return getBooksPageFirestore(pageNumber, pageSize, orderByField, orderDirection, userId);
  }
};

export const getBooksPageFiltered = async (theme, pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
  if (USE_POSTGRES) {
    const params = new URLSearchParams({
      theme,
      page: pageNumber.toString(),
      pageSize: pageSize.toString(),
      orderBy: orderByField,
      orderDirection,
    });
    if (userId) {
      params.append('userId', userId);
    }
    return apiCall(`/v1/books/filtered?${params}`);
  } else {
    const { getBooksPageFiltered: getBooksPageFilteredFirestore } = await import('./firestoreService');
    return getBooksPageFilteredFirestore(theme, pageNumber, pageSize, orderByField, orderDirection, userId);
  }
};

export const getAllDiscussedBooks = async () => {
  if (USE_POSTGRES) {
    return apiCall('/v1/books/discussed');
  } else {
    const { getAllDiscussedBooks: getAllDiscussedBooksFirestore } = await import('./firestoreService');
    return getAllDiscussedBooksFirestore();
  }
};

// Meetings functions
export const getMeetings = async () => {
  if (USE_POSTGRES) {
    const meetings = await apiCall('/v1/meetings');
    return { docs: meetings.map(meeting => ({ id: meeting.id, data: () => meeting })) };
  } else {
    const { getMeetings: getMeetingsFirestore } = await import('./firestoreService');
    return getMeetingsFirestore();
  }
};

// Goals functions
export const getGoals = async (userId) => {
  if (USE_POSTGRES) {
    const goals = await apiCall(`/v1/goals/${userId}`);
    return { docs: goals.map(goal => ({ id: goal.id, data: () => goal })) };
  } else {
    const { getGoals: getGoalsFirestore } = await import('./firestoreService');
    return getGoalsFirestore(userId);
  }
};

export const addGoal = async (userId, goal) => {
  if (USE_POSTGRES) {
    const result = await apiCall(`/v1/goals/${userId}`, {
      method: 'POST',
      body: JSON.stringify(goal),
    });
    return { id: result.id };
  } else {
    const { addGoal: addGoalFirestore } = await import('./firestoreService');
    return addGoalFirestore(userId, goal);
  }
};

export const updateGoal = async (userId, goalId, updates) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/goals/${userId}/${goalId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  } else {
    const { updateGoal: updateGoalFirestore } = await import('./firestoreService');
    return updateGoalFirestore(userId, goalId, updates);
  }
};

export const deleteGoal = async (userId, goalId) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/goals/${userId}/${goalId}`, {
      method: 'DELETE',
    });
  } else {
    const { deleteGoal: deleteGoalFirestore } = await import('./firestoreService');
    return deleteGoalFirestore(userId, goalId);
  }
};

export const checkGoalCompletion = async (userId, goalId, periodId) => {
  if (USE_POSTGRES) {
    const params = new URLSearchParams({ periodId });
    const result = await apiCall(`/v1/goals/${userId}/${goalId}/completion?${params}`);
    return result.completed;
  } else {
    const { checkGoalCompletion: checkGoalCompletionFirestore } = await import('./firestoreService');
    return checkGoalCompletionFirestore(userId, goalId, periodId);
  }
};

export const markGoalComplete = async (userId, goalId, periodId) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/goals/${userId}/${goalId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ periodId }),
    });
  } else {
    const { markGoalComplete: markGoalCompleteFirestore } = await import('./firestoreService');
    return markGoalCompleteFirestore(userId, goalId, periodId);
  }
};

export const markGoalIncomplete = async (userId, goalId, periodId) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/goals/${userId}/${goalId}/complete`, {
      method: 'DELETE',
      body: JSON.stringify({ periodId }),
    });
  } else {
    const { markGoalIncomplete: markGoalIncompleteFirestore } = await import('./firestoreService');
    return markGoalIncompleteFirestore(userId, goalId, periodId);
  }
};

export const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/goals/${userId}/${goalId}/milestone/${milestoneIndex}`, {
      method: 'POST',
    });
  } else {
    const { markMilestoneComplete: markMilestoneCompleteFirestore } = await import('./firestoreService');
    return markMilestoneCompleteFirestore(userId, goalId, milestoneIndex);
  }
};

export const markOneTimeGoalComplete = async (userId, goalId) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/goals/${userId}/${goalId}/complete`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  } else {
    const { markOneTimeGoalComplete: markOneTimeGoalCompleteFirestore } = await import('./firestoreService');
    return markOneTimeGoalCompleteFirestore(userId, goalId);
  }
};

// User functions
export const createUserDocument = async (user) => {
  if (USE_POSTGRES) {
    await apiCall('/v1/users', {
      method: 'POST',
      body: JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      }),
    });
  } else {
    const { createUserDocument: createUserDocumentFirestore } = await import('./firestoreService');
    return createUserDocumentFirestore(user);
  }
};

export const getUserDocument = async (userId) => {
  if (USE_POSTGRES) {
    const user = await apiCall(`/v1/users/${userId}`);
    return { exists: () => true, data: () => user };
  } else {
    const { getUserDocument: getUserDocumentFirestore } = await import('./firestoreService');
    return getUserDocumentFirestore(userId);
  }
};

export const getAllUsers = async () => {
  if (USE_POSTGRES) {
    const users = await apiCall('/v1/users');
    return { docs: users.map(user => ({ id: user.uid, data: () => user })) };
  } else {
    const { getAllUsers: getAllUsersFirestore } = await import('./firestoreService');
    return getAllUsersFirestore();
  }
};

// Progress functions
export const getUserBookProgress = async (userId, bookId) => {
  if (USE_POSTGRES) {
    return apiCall(`/v1/progress/${userId}/${bookId}`);
  } else {
    const { getUserBookProgress: getUserBookProgressFirestore } = await import('./firestoreService');
    return getUserBookProgressFirestore(userId, bookId);
  }
};

export const getAllUserBookProgress = async (userId) => {
  if (USE_POSTGRES) {
    return apiCall(`/v1/progress/user/${userId}`);
  } else {
    const { getAllUserBookProgress: getAllUserBookProgressFirestore } = await import('./firestoreService');
    return getAllUserBookProgressFirestore(userId);
  }
};

export const updateUserBookProgress = async (userId, bookId, progressData) => {
  if (USE_POSTGRES) {
    return apiCall(`/v1/progress/${userId}/${bookId}`, {
      method: 'PUT',
      body: JSON.stringify(progressData),
    });
  } else {
    const { updateUserBookProgress: updateUserBookProgressFirestore } = await import('./firestoreService');
    return updateUserBookProgressFirestore(userId, bookId, progressData);
  }
};

export const getAllUsersProgressForBook = async (bookId) => {
  if (USE_POSTGRES) {
    return apiCall(`/v1/progress/book/${bookId}`);
  } else {
    const { getAllUsersProgressForBook: getAllUsersProgressForBookFirestore } = await import('./firestoreService');
    return getAllUsersProgressForBookFirestore(bookId);
  }
};

export const deleteUserBookProgress = async (userId, bookId) => {
  if (USE_POSTGRES) {
    await apiCall(`/v1/progress/${userId}/${bookId}`, {
      method: 'DELETE',
    });
  } else {
    const { deleteUserBookProgress: deleteUserBookProgressFirestore } = await import('./firestoreService');
    return deleteUserBookProgressFirestore(userId, bookId);
  }
};

// Stats functions
export const getUserStats = async (userId) => {
  if (USE_POSTGRES) {
    return apiCall(`/v1/stats/users/${userId}`);
  } else {
    const { getUserStats: getUserStatsFirestore } = await import('./firestoreService');
    return getUserStatsFirestore(userId);
  }
};

export const getTopFinishedBooksUsers = async (limitCount = 10) => {
  if (USE_POSTGRES) {
    const params = new URLSearchParams({ limit: limitCount.toString() });
    return apiCall(`/v1/stats/leaderboard?${params}`);
  } else {
    const { getTopFinishedBooksUsers: getTopFinishedBooksUsersFirestore } = await import('./firestoreService');
    return getTopFinishedBooksUsersFirestore(limitCount);
  }
};

export const getBookStats = async (bookId) => {
  if (USE_POSTGRES) {
    return apiCall(`/v1/stats/books/${bookId}`);
  } else {
    const { getBookStats: getBookStatsFirestore } = await import('./firestoreService');
    return getBookStatsFirestore(bookId);
  }
};

// Legacy functions for backward compatibility
export const getBookMetadata = async () => {
  if (USE_POSTGRES) {
    // For PostgreSQL, we compute this on-demand
    const result = await getBooksPage(1, 1);
    return { totalCount: result.totalCount, lastUpdated: new Date() };
  } else {
    const { getBookMetadata: getBookMetadataFirestore } = await import('./firestoreService');
    return getBookMetadataFirestore();
  }
};

export const updateBookMetadata = async (incrementBy = 1) => {
  // This is a no-op for PostgreSQL since we compute metadata on-demand
  if (!USE_POSTGRES) {
    const { updateBookMetadata: updateBookMetadataFirestore } = await import('./firestoreService');
    return updateBookMetadataFirestore(incrementBy);
  }
};

export const initializeBookMetadata = async () => {
  if (USE_POSTGRES) {
    const result = await getBooksPage(1, 1);
    return result.totalCount;
  } else {
    const { initializeBookMetadata: initializeBookMetadataFirestore } = await import('./firestoreService');
    return initializeBookMetadataFirestore();
  }
};
