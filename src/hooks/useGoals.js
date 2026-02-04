import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Services
import {
  getGoals,
  addGoal,
  updateGoal,
  deleteGoal,
} from 'services/goals/goals.service';
// Utils
import { normalizeGoalType } from 'utils/goalHelpers';

const normalizeGoal = (goalData, docId = null, preserveEntries = false) => {
  if (!goalData.milestones && goalData.Milestones) {
    goalData.milestones = goalData.Milestones;
  }
  if (!goalData.milestones) {
    goalData.milestones = [];
  }
  if (Array.isArray(goalData.milestones)) {
    goalData.milestones = goalData.milestones.map(m => ({
      ...m,
      id: m.id || m.ID,
      done: m.done || false,
      title: m.title || 'Untitled milestone',
      order: m.order !== undefined ? m.order : (m.id || m.ID || 0),
    }));
  }
  goalData.type = normalizeGoalType(goalData.type);

  const normalized = {
    id: docId || goalData.id,
    ...goalData,
  };

  if (!preserveEntries) {
    if (!normalized.entries) {
      normalized.entries = [];
    }
    if (!normalized.entriesPagination) {
      normalized.entriesPagination = {
        hasMore: true,
        offset: 0,
        limit: 10,
      };
    }
  }

  return normalized;
};

const fetchGoals = async (userId, clubId, options = {}) => {
  const goals = await getGoals(userId, clubId, options);
  return goals.map(goal => {
    const normalized = normalizeGoal(goal, goal.id);
    if (normalized.entries && normalized.entries.length > 0 && !normalized.entriesPagination) {
      normalized.entriesPagination = {
        hasMore: false,
        offset: normalized.entries.length,
        limit: 10,
      };
    }
    return normalized;
  });
};

export const useGoals = (userId, clubId, options = {}) => {
  return useQuery({
    queryKey: ['goals', userId, clubId, options],
    queryFn: () => fetchGoals(userId, clubId, options),
    enabled: !!userId && !!clubId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateGoal = (userId, clubId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalData) => addGoal(userId, clubId, goalData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userId, clubId] });
    },
  });
};

export const useUpdateGoal = (userId, clubId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ goalId, updates }) => updateGoal(userId, clubId, goalId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userId, clubId] });
    },
  });
};

export const useDeleteGoal = (userId, clubId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (goalId) => deleteGoal(userId, clubId, goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals', userId, clubId] });
    },
  });
};
