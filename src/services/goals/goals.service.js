import { apiCall } from '../apiHelpers';

// Goals CRUD functions
export const getGoals = async (userId, clubId, options = {}) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  if (options.type) params.append('type', options.type);
  if (options.completed !== undefined) params.append('completed', options.completed.toString());
  if (options.sort) params.append('sort', options.sort);
  if (options.period) params.append('period', options.period);
  const goals = await apiCall(`/v1/goals?${params}`);
  return goals;
};

export const addGoal = async (userId, clubId, goal) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  const result = await apiCall(`/v1/goals?${params}`, {
    method: 'POST',
    body: JSON.stringify(goal),
  });
  return result; // Return the full goal object from API
};

export const updateGoal = async (userId, clubId, goalId, updates) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  const result = await apiCall(`/v1/goals/${goalId}?${params}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return result; // Return the full updated goal object from API
};

export const deleteGoal = async (userId, clubId, goalId) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  await apiCall(`/v1/goals/${goalId}?${params}`, {
    method: 'DELETE',
  });
};

// Goal completion functions
export const checkGoalCompletion = async (userId, goalId, periodId) => {
  const params = new URLSearchParams({ userId, periodId });
  const result = await apiCall(`/v1/goals/${goalId}/completion?${params}`);
  return result.completed;
};

export const markGoalComplete = async (userId, goalId, periodId) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/goals/${goalId}/complete?${params}`, {
    method: 'POST',
    body: JSON.stringify({ periodId }),
  });
};

export const markGoalIncomplete = async (userId, goalId, periodId) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/goals/${goalId}/complete?${params}`, {
    method: 'DELETE',
    body: JSON.stringify({ periodId }),
  });
};

export const markOneTimeGoalComplete = async (userId, goalId) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/goals/${goalId}/complete?${params}`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

// Goal entry management functions
export const createGoalEntry = async (userId, goalId, entryData) => {
  const params = new URLSearchParams({ userId });
  const result = await apiCall(`/v1/goals/${goalId}/entries?${params}`, {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
  // API returns entry directly: {id, goalId, userId, occurredAt, quantity, created_at}
  // Return in a consistent format for backward compatibility
  return {
    entry: result, // The entry object itself
    goal: result.goal || null, // API doesn't return goal, so null
    // For backward compatibility, also return entry properties at top level
    ...result,
  };
};

export const getGoalEntries = async (userId, goalId, periodStart = null, periodEnd = null, limit = null, offset = 0) => {
  const params = new URLSearchParams({ userId });
  if (periodStart) params.append('periodStart', periodStart.toISOString());
  if (periodEnd) params.append('periodEnd', periodEnd.toISOString());
  if (limit !== null) params.append('limit', limit.toString());
  if (offset > 0) params.append('offset', offset.toString());
  return apiCall(`/v1/goals/${goalId}/entries?${params}`);
};

export const updateGoalEntry = async (userId, goalId, entryId, updates) => {
  const params = new URLSearchParams({ userId });
  const result = await apiCall(`/v1/goals/${goalId}/entries/${entryId}?${params}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  // Return both entry and goal for backward compatibility
  return {
    entry: result.entry,
    goal: result.goal,
    // For backward compatibility, also return entry properties at top level
    ...result.entry,
  };
};

export const deleteGoalEntry = async (userId, goalId, entryId) => {
  const params = new URLSearchParams({ userId });
  // DELETE endpoint returns 204 (no content), so result will be null/undefined
  await apiCall(`/v1/goals/${goalId}/entries/${entryId}?${params}`, {
    method: 'DELETE',
  });
  // Return null since API doesn't return goal object
  return null;
};

// Goal progress functions
export const getGoalProgress = async (userId, goalId, period = 'current') => {
  const params = new URLSearchParams({ userId, period });
  return apiCall(`/v1/goals/${goalId}/progress?${params}`);
};

// Milestone functions
export const createMilestone = async (userId, goalId, milestoneData) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/goals/${goalId}/milestones?${params}`, {
    method: 'POST',
    body: JSON.stringify(milestoneData),
  });
};

export const updateMilestone = async (userId, goalId, milestoneId, updates) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/goals/${goalId}/milestones/${milestoneId}?${params}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/goals/${goalId}/milestone/${milestoneIndex}?${params}`, {
    method: 'POST',
  });
};

