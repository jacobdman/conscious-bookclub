import { apiCall } from '../apiHelpers';

// Goals CRUD functions
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

// Goal completion functions
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

export const markOneTimeGoalComplete = async (userId, goalId) => {
  await apiCall(`/v1/goals/${userId}/${goalId}/complete`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
};

// Goal entry management functions
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

// Goal progress functions
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

export const markMilestoneComplete = async (userId, goalId, milestoneIndex) => {
  await apiCall(`/v1/goals/${userId}/${goalId}/milestone/${milestoneIndex}`, {
    method: 'POST',
  });
};

