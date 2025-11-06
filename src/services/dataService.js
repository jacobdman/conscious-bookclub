// Data service using API endpoints
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

// Global error notification handler (will be set by ErrorNotificationProvider)
let globalErrorHandler = null;

export const setGlobalErrorHandler = (handler) => {
  globalErrorHandler = handler;
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      // Try to extract error message from response
      let errorMessage = `API call failed: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, use default message
      }

      // Show global error notification
      if (globalErrorHandler) {
        globalErrorHandler(errorMessage);
      }

      throw new Error(errorMessage);
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null;
    }

    return response.json();
  } catch (error) {
    // If it's already an Error with message, re-throw it
    if (error instanceof Error) {
      throw error;
    }
    // Otherwise, create a new error
    const errorMessage = error.message || 'An unexpected error occurred';
    if (globalErrorHandler) {
      globalErrorHandler(errorMessage);
    }
    throw new Error(errorMessage);
  }
};

// Posts functions
export const getPosts = async () => {
  const posts = await apiCall('/v1/posts');
  return { docs: posts.map(post => ({ id: post.id, data: () => post })) };
};

export const addPost = async (post) => {
  const result = await apiCall('/v1/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
  return { id: result.id };
};

// Books functions
export const getBooks = async () => {
  const result = await apiCall('/v1/books');
  return { docs: result.books.map(book => ({ id: book.id, data: () => book })) };
};

export const addBook = async (book) => {
  const result = await apiCall('/v1/books', {
    method: 'POST',
    body: JSON.stringify(book),
  });
  return { id: result.id };
};

export const updateBook = async (bookId, updates) => {
  await apiCall(`/v1/books/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteBook = async (bookId) => {
  await apiCall(`/v1/books/${bookId}`, {
    method: 'DELETE',
  });
};

export const getBooksPage = async (pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
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
};

export const getBooksPageFiltered = async (theme, pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
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
};

export const getAllDiscussedBooks = async () => {
  return apiCall('/v1/books/discussed');
};

// Meetings functions
export const getMeetings = async () => {
  const meetings = await apiCall('/v1/meetings');
  return { docs: meetings.map(meeting => ({ id: meeting.id, data: () => meeting })) };
};

// Goals functions
export const getGoals = async (userId) => {
  const goals = await apiCall(`/v1/goals/${userId}`);
  return { docs: goals.map(goal => ({ id: goal.id, data: () => goal })) };
};

export const addGoal = async (userId, goal) => {
  const result = await apiCall(`/v1/goals/${userId}`, {
    method: 'POST',
    body: JSON.stringify(goal),
  });
  return result; // Return the full goal object from API
};

export const updateGoal = async (userId, goalId, updates) => {
  await apiCall(`/v1/goals/${userId}/${goalId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteGoal = async (userId, goalId) => {
  await apiCall(`/v1/goals/${userId}/${goalId}`, {
    method: 'DELETE',
  });
};

export const checkGoalCompletion = async (userId, goalId, periodId) => {
  const params = new URLSearchParams({ periodId });
  const result = await apiCall(`/v1/goals/${userId}/${goalId}/completion?${params}`);
  return result.completed;
};

export const markGoalComplete = async (userId, goalId, periodId) => {
  await apiCall(`/v1/goals/${userId}/${goalId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ periodId }),
  });
};

export const markGoalIncomplete = async (userId, goalId, periodId) => {
  await apiCall(`/v1/goals/${userId}/${goalId}/complete`, {
    method: 'DELETE',
    body: JSON.stringify({ periodId }),
  });
};

export const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  await apiCall(`/v1/goals/${userId}/${goalId}/milestone/${milestoneIndex}`, {
    method: 'POST',
  });
};

export const markOneTimeGoalComplete = async (userId, goalId) => {
  await apiCall(`/v1/goals/${userId}/${goalId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

// Entry management functions
export const createGoalEntry = async (userId, goalId, entryData) => {
  return apiCall(`/v1/goals/${userId}/${goalId}/entries`, {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

export const getGoalEntries = async (userId, goalId, periodStart = null, periodEnd = null) => {
  const params = new URLSearchParams();
  if (periodStart) params.append('periodStart', periodStart.toISOString());
  if (periodEnd) params.append('periodEnd', periodEnd.toISOString());
  return apiCall(`/v1/goals/${userId}/${goalId}/entries?${params}`);
};

export const updateGoalEntry = async (userId, goalId, entryId, updates) => {
  return apiCall(`/v1/goals/${userId}/${goalId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteGoalEntry = async (userId, goalId, entryId) => {
  await apiCall(`/v1/goals/${userId}/${goalId}/entries/${entryId}`, {
    method: 'DELETE',
  });
};

// Progress functions
export const getGoalProgress = async (userId, goalId) => {
  return apiCall(`/v1/goals/${userId}/${goalId}/progress`);
};

// Milestone functions
export const createMilestone = async (userId, goalId, milestoneData) => {
  return apiCall(`/v1/goals/${userId}/${goalId}/milestones`, {
    method: 'POST',
    body: JSON.stringify(milestoneData),
  });
};

export const updateMilestone = async (userId, goalId, milestoneId, updates) => {
  return apiCall(`/v1/goals/${userId}/${goalId}/milestones/${milestoneId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

// User functions
export const createUserDocument = async (user) => {
  await apiCall('/v1/users', {
    method: 'POST',
    body: JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }),
  });
};

export const getUserDocument = async (userId) => {
  const user = await apiCall(`/v1/users/${userId}`);
  return { exists: () => true, data: () => user };
};

export const getAllUsers = async () => {
  const users = await apiCall('/v1/users');
  return { docs: users.map(user => ({ id: user.uid, data: () => user })) };
};

// Progress functions
export const getUserBookProgress = async (userId, bookId) => {
  return apiCall(`/v1/progress/${userId}/${bookId}`);
};

export const getAllUserBookProgress = async (userId) => {
  return apiCall(`/v1/progress/user/${userId}`);
};

export const updateUserBookProgress = async (userId, bookId, progressData) => {
  return apiCall(`/v1/progress/${userId}/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(progressData),
  });
};

export const getAllUsersProgressForBook = async (bookId) => {
  return apiCall(`/v1/progress/book/${bookId}`);
};

export const deleteUserBookProgress = async (userId, bookId) => {
  await apiCall(`/v1/progress/${userId}/${bookId}`, {
    method: 'DELETE',
  });
};

// Stats functions
export const getUserStats = async (userId) => {
  return apiCall(`/v1/stats/users/${userId}`);
};

export const getTopFinishedBooksUsers = async (limitCount = 10) => {
  const params = new URLSearchParams({ limit: limitCount.toString() });
  return apiCall(`/v1/stats/leaderboard?${params}`);
};

export const getBookStats = async (bookId) => {
  return apiCall(`/v1/stats/books/${bookId}`);
};

// Legacy functions for backward compatibility
export const getBookMetadata = async () => {
  // For PostgreSQL, we compute this on-demand
  const result = await getBooksPage(1, 1);
  return { totalCount: result.totalCount, lastUpdated: new Date() };
};

export const updateBookMetadata = async (incrementBy = 1) => {
  // This is a no-op for PostgreSQL since we compute metadata on-demand
};

export const initializeBookMetadata = async () => {
  const result = await getBooksPage(1, 1);
  return result.totalCount;
};
