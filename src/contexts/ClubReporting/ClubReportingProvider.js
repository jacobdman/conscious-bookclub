import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'AuthContext';
// Context
import useClubContext from 'contexts/Club';
// Services
import { getClubMembers } from 'services/clubs/clubs.service';
import { getGoals } from 'services/goals/goals.service';
import ClubReportingContext from './ClubReportingContext';

const ClubReportingProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [clubGoalsByUser, setClubGoalsByUser] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingByUser, setLoadingByUser] = useState({});

  const clubGoals = useMemo(() => {
    const entries = Object.entries(clubGoalsByUser).map(([userId, goals]) => ({
      userId,
      goals,
    }));
    return entries.sort((a, b) => a.userId.localeCompare(b.userId));
  }, [clubGoalsByUser]);

  useEffect(() => {
    setClubGoalsByUser({});
    setLoadingByUser({});
    setError(null);
  }, [currentClub?.id]);

  const fetchUserGoals = useCallback(async (targetUserId, { force = false } = {}) => {
    if (!user || !currentClub || !targetUserId) return [];

    if (!force && clubGoalsByUser[targetUserId]) {
      return clubGoalsByUser[targetUserId];
    }

    try {
      setLoadingByUser(prev => ({ ...prev, [targetUserId]: true }));
      const goals = await getGoals(targetUserId, currentClub.id);
      setClubGoalsByUser(prev => ({ ...prev, [targetUserId]: goals }));
      return goals;
    } catch (err) {
      console.error('Error fetching club user goals:', err);
      setError('Failed to load club goals');
      return [];
    } finally {
      setLoadingByUser(prev => ({ ...prev, [targetUserId]: false }));
    }
  }, [user, currentClub, clubGoalsByUser]);

  const prefetchUsersGoals = useCallback(async (userIds = [], { force = false } = {}) => {
    if (!user || !currentClub || !userIds.length) return;
    
    // Filter out users we already have cached (unless force=true)
    const usersToFetch = force 
      ? userIds 
      : userIds.filter(userId => !clubGoalsByUser[userId]);
      
    if (!usersToFetch.length) return; // All cached
    
    try {
      // Mark all users as loading
      setLoadingByUser(prev => {
        const updates = {};
        usersToFetch.forEach(userId => updates[userId] = true);
        return { ...prev, ...updates };
      });
      
      // Fetch all in parallel
      const results = await Promise.allSettled(
        usersToFetch.map(userId => getGoals(userId, currentClub.id))
      );
      
      // Update cache with successful results
      const goalsByUser = {};
      results.forEach((result, index) => {
        const userId = usersToFetch[index];
        if (result.status === 'fulfilled') {
          goalsByUser[userId] = result.value;
        } else {
          console.error(`Failed to fetch goals for user ${userId}:`, result.reason);
          goalsByUser[userId] = []; // Empty array on error
        }
      });
      
      setClubGoalsByUser(prev => ({ ...prev, ...goalsByUser }));
    } catch (err) {
      console.error('Error prefetching user goals:', err);
    } finally {
      // Clear loading states
      setLoadingByUser(prev => {
        const updates = { ...prev };
        usersToFetch.forEach(userId => delete updates[userId]);
        return updates;
      });
    }
  }, [user, currentClub, clubGoalsByUser]);

  const refreshClubGoals = useCallback(async () => {
    if (!user || !currentClub) return [];

    try {
      setLoading(true);
      setError(null);
      const members = await getClubMembers(currentClub.id, user.uid);
      const memberIds = (members || []).map(member => member.userId || member.user?.uid).filter(Boolean);

      const goalsByUser = {};
      await Promise.all(
        memberIds.map(async (memberId) => {
          try {
            const goals = await getGoals(memberId, currentClub.id);
            goalsByUser[memberId] = goals;
          } catch (err) {
            console.error(`Error fetching goals for member ${memberId}:`, err);
            goalsByUser[memberId] = [];
          }
        })
      );

      setClubGoalsByUser(goalsByUser);
      return goalsByUser;
    } catch (err) {
      console.error('Error refreshing club goals:', err);
      setError('Failed to refresh club goals');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user, currentClub]);

  return (
    <ClubReportingContext.Provider
      value={{
        clubGoals,
        clubGoalsByUser,
        loading,
        error,
        loadingByUser,
        fetchUserGoals,
        refreshClubGoals,
        prefetchUsersGoals,
      }}
    >
      {children}
    </ClubReportingContext.Provider>
  );
};

export const useClubReporting = () => {
  const context = React.useContext(ClubReportingContext);
  if (!context) {
    throw new Error('useClubReporting must be used within a ClubReportingProvider');
  }
  return context;
};

export default ClubReportingProvider;
