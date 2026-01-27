import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from 'AuthContext';
import { getUserClubs, getClub, getClubMembers } from 'services/clubs/clubs.service';
import ClubContext from './ClubContext';

const CURRENT_CLUB_STORAGE_KEY = 'currentClubId';

// ******************STATE VALUES**********************
const ClubProvider = ({ children }) => {
  const { user } = useAuth();
  const [currentClub, setCurrentClubState] = useState(null);
  const [userClubs, setUserClubs] = useState([]);
  const [clubMembers, setClubMembers] = useState([]);
  const [membersGoalStatus, setMembersGoalStatus] = useState({});
  const [membersFetchedForClub, setMembersFetchedForClub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const clubMembersRef = useRef([]);

  // ******************LOAD FUNCTIONS**********************
  // Fetch user's clubs
  const refreshClubs = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const clubs = await getUserClubs(user.uid);
      setUserClubs(clubs);

      // If no current club is set, use first club or stored club
      const storedClubId = localStorage.getItem(CURRENT_CLUB_STORAGE_KEY);
      let clubToSet = null;

      if (storedClubId) {
        // Verify stored club is still in user's clubs
        clubToSet = clubs.find(c => c.id === parseInt(storedClubId));
      }

      // If no valid stored club, use first club
      if (!clubToSet && clubs.length > 0) {
        clubToSet = clubs[0];
      }

      if (clubToSet) {
        setCurrentClubState(clubToSet);
        localStorage.setItem(CURRENT_CLUB_STORAGE_KEY, clubToSet.id.toString());
      } else {
        setCurrentClubState(null);
        localStorage.removeItem(CURRENT_CLUB_STORAGE_KEY);
      }
    } catch (err) {
      setError('Failed to fetch clubs');
      console.error('Error fetching clubs:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch club members (with smart caching)
  const refreshClubMembers = useCallback(async (clubId, force = false) => {
    if (!user || !clubId) return;

    // Don't refetch if we already have data for this club (unless forced)
    if (!force && membersFetchedForClub === clubId && clubMembersRef.current.length > 0) {
      console.log(`[ClubProvider] Skipping refetch - members already cached for club ${clubId}`);
      return clubMembersRef.current;
    }

    try {
      console.log(`[ClubProvider] Fetching members for club ${clubId}`);
      const members = await getClubMembers(clubId, user.uid);
      console.log(`[ClubProvider] Received ${members.length} members:`, members);
      setClubMembers(members);
      clubMembersRef.current = members;
      setMembersFetchedForClub(clubId);
      
      // Extract and cache goal status
      const goalStatus = {};
      members.forEach(member => {
        if (member.lastGoalEntryAt) {
          goalStatus[member.userId] = member.lastGoalEntryAt;
        }
      });
      setMembersGoalStatus(goalStatus);
      
      return members;
    } catch (err) {
      console.error('Error fetching club members:', err);
      throw err;
    }
  }, [user, membersFetchedForClub]);

  // ******************EFFECTS/REACTIONS**********************
  // Keep ref in sync with state
  useEffect(() => {
    clubMembersRef.current = clubMembers;
  }, [clubMembers]);

  // Initial load
  useEffect(() => {
    refreshClubs();
  }, [refreshClubs]);

  // Reset cache when club changes
  useEffect(() => {
    if (currentClub && membersFetchedForClub !== currentClub.id) {
      // Clear old data when switching clubs
      setClubMembers([]);
      setMembersGoalStatus({});
    }
  }, [currentClub, membersFetchedForClub]);

  // Load club members when current club changes (only if not cached)
  useEffect(() => {
    if (currentClub && user) {
      refreshClubMembers(currentClub.id);
    } else {
      setClubMembers([]);
      setMembersGoalStatus({});
      setMembersFetchedForClub(null);
    }
  }, [currentClub, user, refreshClubMembers]);

  // ******************SETTERS**********************
  // Set current club
  const setCurrentClub = useCallback(async (clubId) => {
    if (!user) return;

    try {
      // Verify user is member of this club
      const club = await getClub(clubId, user.uid);
      setCurrentClubState(club);
      localStorage.setItem(CURRENT_CLUB_STORAGE_KEY, clubId.toString());
    } catch (err) {
      setError('Failed to switch club');
      console.error('Error switching club:', err);
      throw err;
    }
  }, [user]);

  // ******************EXPORTS**********************
  return (
    <ClubContext.Provider
      value={{
        currentClub,
        userClubs,
        clubMembers,
        membersGoalStatus,
        loading,
        error,
        setCurrentClub,
        refreshClubs,
        refreshClubMembers,
      }}
    >
      {children}
    </ClubContext.Provider>
  );
};

export const useClubContext = () => {
  const context = React.useContext(ClubContext);
  if (!context) {
    throw new Error('useClubContext must be used within a ClubProvider');
  }
  return context;
};

export default ClubProvider;

