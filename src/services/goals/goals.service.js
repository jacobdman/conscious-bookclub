import { apiCall } from '../apiHelpers';

// Goals CRUD functions
export const getGoals = async (userId, options = {}) => {
  const params = new URLSearchParams({ userId });
  if (options.type) params.append('type', options.type);
  if (options.completed !== undefined) params.append('completed', options.completed.toString());
  if (options.sort) params.append('sort', options.sort);
  if (options.period) params.append('period', options.period);
  const goals = await apiCall(`/v1/goals?${params}`);
  return goals;
};

export const addGoal = async (userId, goal) => {
  const params = new URLSearchParams({ userId });
  const result = await apiCall(`/v1/goals?${params}`, {
    method: 'POST',
    body: JSON.stringify(goal),
  });
  return result; // Return the full goal object from API
};

export const updateGoal = async (userId, goalId, updates) => {
  const params = new URLSearchParams({ userId });
  const result = await apiCall(`/v1/goals/${goalId}?${params}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return result; // Return the full updated goal object from API
};

export const deleteGoal = async (userId, goalId) => {
  const params = new URLSearchParams({ userId });
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
  return apiCall(`/v1/goals/${goalId}/entries?${params}`, {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

export const getGoalEntries = async (userId, goalId, periodStart = null, periodEnd = null) => {
  const params = new URLSearchParams({ userId });
  if (periodStart) params.append('periodStart', periodStart.toISOString());
  if (periodEnd) params.append('periodEnd', periodEnd.toISOString());
  return apiCall(`/v1/goals/${goalId}/entries?${params}`);
};

export const updateGoalEntry = async (userId, goalId, entryId, updates) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/goals/${goalId}/entries/${entryId}?${params}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteGoalEntry = async (userId, goalId, entryId) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/goals/${goalId}/entries/${entryId}?${params}`, {
    method: 'DELETE',
  });
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

