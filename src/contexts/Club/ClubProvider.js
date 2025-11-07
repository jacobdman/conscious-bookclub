import React, { useState, useEffect, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Fetch club members
  const refreshClubMembers = useCallback(async (clubId) => {
    if (!user || !clubId) return;

    try {
      const members = await getClubMembers(clubId, user.uid);
      setClubMembers(members);
      return members;
    } catch (err) {
      console.error('Error fetching club members:', err);
      throw err;
    }
  }, [user]);

  // ******************EFFECTS/REACTIONS**********************
  // Initial load
  useEffect(() => {
    refreshClubs();
  }, [refreshClubs]);

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

