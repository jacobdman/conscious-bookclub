import React, { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import ClubGoalsContext from './ClubGoalsContext';
import {
  getClubGoals,
  createClubGoal as createClubGoalApi,
  updateClubGoal as updateClubGoalApi,
  deleteClubGoal as deleteClubGoalApi,
} from 'services/clubs/clubGoals.service';

const clubGoalsQueryKey = (userId, clubId) => ['clubGoals', userId, clubId];

const emptySnapshotForType = (type) => {
  switch (type) {
    case 'metric':
      return { actual: 0, target: 0, percent: 0, label: 'sum_quantity', totalMembers: 0, completedMembers: 0 };
    case 'habit':
      return { actual: 0, target: 0, percent: 0, label: 'members_completed_period', totalMembers: 0, completedMembers: 0 };
    case 'one_time':
      return { actual: 0, target: 0, percent: 0, label: 'members_completed', totalMembers: 0, completedMembers: 0 };
    case 'milestone':
      return { actual: 0, target: 0, percent: 0, label: 'milestones_done', totalMembers: 0, completedMembers: 0 };
    default:
      return { actual: 0, target: 0, percent: 0, totalMembers: 0, completedMembers: 0 };
  }
};

// ******************STATE VALUES**********************
const ClubGoalsProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const queryClient = useQueryClient();
  const userId = user?.uid;
  const clubId = currentClub?.id;

  const {
    data: clubGoals = [],
    isLoading: loading,
    error: queryError,
    refetch: refreshClubGoals,
  } = useQuery({
    queryKey: clubGoalsQueryKey(userId, clubId),
    queryFn: async () => {
      if (!userId || !clubId) return [];
      const res = await getClubGoals(clubId, userId);
      return Array.isArray(res) ? res : [];
    },
    enabled: !!userId && !!clubId,
  });

  const error = queryError ? queryError.message || 'Failed to load club goals' : null;

  // ******************UTILITY FUNCTIONS**********************

  /**
   * Centralized cache sync for club-goal CRUD. Optimistically patches every
   * cache surface that lists club goals so any consumer (list table,
   * dashboard carousel, edit form picker) re-renders from a single mutation
   * without waiting for a refetch.
   *
   * @param {'create'|'update'|'remove'} kind
   * @param {object} clubGoal Raw club goal payload from API (or { id } for remove).
   */
  const syncClubGoalsCaches = useCallback(
    (kind, clubGoal) => {
      if (!clubGoal) return;

      queryClient.setQueriesData({ queryKey: ['clubGoals'] }, (oldData) => {
        if (!Array.isArray(oldData)) return oldData;
        if (kind === 'create') {
          if (oldData.some((cg) => Number(cg.id) === Number(clubGoal.id))) return oldData;
          return [...oldData, clubGoal];
        }
        if (kind === 'update') {
          return oldData.map((cg) =>
            Number(cg.id) === Number(clubGoal.id) ? { ...cg, ...clubGoal } : cg,
          );
        }
        return oldData.filter((cg) => Number(cg.id) !== Number(clubGoal.id));
      });

      queryClient.setQueriesData({ queryKey: ['clubGoalOverview'] }, (oldData) => {
        if (!oldData?.clubGoals) return oldData;
        if (kind === 'create') {
          const exists = oldData.clubGoals.some(
            (cg) => Number(cg.id) === Number(clubGoal.id),
          );
          if (exists) return oldData;
          return {
            ...oldData,
            clubGoals: [
              ...oldData.clubGoals,
              {
                ...clubGoal,
                memberGoalCount: clubGoal.memberGoalCount ?? 0,
                snapshot: emptySnapshotForType(clubGoal.type),
              },
            ],
          };
        }
        if (kind === 'update') {
          return {
            ...oldData,
            clubGoals: oldData.clubGoals.map((cg) =>
              Number(cg.id) === Number(clubGoal.id) ? { ...cg, ...clubGoal } : cg,
            ),
          };
        }
        return {
          ...oldData,
          clubGoals: oldData.clubGoals.filter(
            (cg) => Number(cg.id) !== Number(clubGoal.id),
          ),
        };
      });

      queryClient.invalidateQueries({ queryKey: clubGoalsQueryKey(userId, clubId) });
      queryClient.invalidateQueries({ queryKey: ['goals', userId, clubId] });
      queryClient.invalidateQueries({ queryKey: ['clubGoalOverview'] });
    },
    [queryClient, userId, clubId],
  );

  const createMutation = useMutation({
    mutationFn: async (body) => {
      if (!userId || !clubId) throw new Error('Not signed in or no club');
      return createClubGoalApi(clubId, userId, body);
    },
    onSuccess: (result) => {
      const created = result?.clubGoal || result?.data || result;
      if (created?.id != null) {
        syncClubGoalsCaches('create', created);
      } else {
        queryClient.invalidateQueries({ queryKey: clubGoalsQueryKey(userId, clubId) });
        queryClient.invalidateQueries({ queryKey: ['goals', userId, clubId] });
        queryClient.invalidateQueries({ queryKey: ['clubGoalOverview'] });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ clubGoalId, body }) => {
      if (!userId || !clubId) throw new Error('Not signed in or no club');
      return updateClubGoalApi(clubId, clubGoalId, userId, body);
    },
    onSuccess: (result, variables) => {
      const updated = result?.clubGoal || result?.data || result;
      if (updated?.id != null) {
        syncClubGoalsCaches('update', updated);
      } else if (variables?.clubGoalId != null) {
        syncClubGoalsCaches('update', { id: variables.clubGoalId, ...variables.body });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (clubGoalId) => {
      if (!userId || !clubId) throw new Error('Not signed in or no club');
      await deleteClubGoalApi(clubId, clubGoalId, userId);
      return { id: clubGoalId };
    },
    onSuccess: ({ id }) => {
      syncClubGoalsCaches('remove', { id });
    },
  });

  // ******************SETTERS / ACTIONS**********************
  const createClubGoal = useCallback(
    async (body) => {
      const res = await createMutation.mutateAsync(body);
      return res;
    },
    [createMutation],
  );

  const updateClubGoal = useCallback(
    async (clubGoalId, body) => {
      const res = await updateMutation.mutateAsync({ clubGoalId, body });
      return res;
    },
    [updateMutation],
  );

  const deleteClubGoal = useCallback(
    async (clubGoalId) => {
      await deleteMutation.mutateAsync(clubGoalId);
    },
    [deleteMutation],
  );

  // ******************EXPORTS**********************
  const value = useMemo(
    () => ({
      clubGoals,
      loading,
      error,
      refreshClubGoals,
      createClubGoal,
      updateClubGoal,
      deleteClubGoal,
    }),
    [
      clubGoals,
      loading,
      error,
      refreshClubGoals,
      createClubGoal,
      updateClubGoal,
      deleteClubGoal,
    ],
  );

  return <ClubGoalsContext.Provider value={value}>{children}</ClubGoalsContext.Provider>;
};

export const useClubGoalsContext = () => {
  const ctx = React.useContext(ClubGoalsContext);
  if (ctx == null) {
    throw new Error('useClubGoalsContext must be used within ClubGoalsProvider');
  }
  return ctx;
};

export default ClubGoalsProvider;
