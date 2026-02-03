import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from 'AuthContext';
import { updateUserProfile } from 'services/users/users.service';
import TutorialContext from './TutorialContext';

// ******************STATE VALUES**********************
const TutorialProvider = ({ children }) => {
  const { user, userProfile, setUserProfile } = useAuth();
  const [completedTutorials, setCompletedTutorials] = useState({});
  const [activeTutorialId, setActiveTutorialId] = useState(null);

  // ******************EFFECTS/REACTIONS**********************
  useEffect(() => {
    if (!user) {
      setCompletedTutorials({});
      setActiveTutorialId(null);
      return;
    }
    setCompletedTutorials(userProfile?.settings?.completedTutorials || {});
  }, [user, userProfile]);

  // ******************SETTERS**********************
  const startTutorial = useCallback((tutorialId) => {
    if (!tutorialId) return;
    setActiveTutorialId(tutorialId);
  }, []);

  const stopTutorial = useCallback(() => {
    setActiveTutorialId(null);
  }, []);

  // ******************UTILITY FUNCTIONS**********************
  const shouldShowTutorial = useCallback(
    (tutorialId) => Boolean(user && tutorialId && !completedTutorials[tutorialId]),
    [user, completedTutorials],
  );

  const persistCompletedTutorials = useCallback(
    async (nextCompletedTutorials) => {
      if (!user) return;
      try {
        const updatedUser = await updateUserProfile(user.uid, {
          settings: {
            completedTutorials: nextCompletedTutorials,
          },
        });
        if (updatedUser) {
          setUserProfile(updatedUser);
        }
      } catch (error) {
        console.error('Failed to save tutorial progress:', error);
      }
    },
    [user, setUserProfile],
  );

  const completeTutorial = useCallback(
    async (tutorialId) => {
      if (!tutorialId) return;
      const nextCompletedTutorials = {
        ...completedTutorials,
        [tutorialId]: true,
      };
      setCompletedTutorials(nextCompletedTutorials);
      setActiveTutorialId(null);
      await persistCompletedTutorials(nextCompletedTutorials);
    },
    [completedTutorials, persistCompletedTutorials],
  );

  const resetTutorial = useCallback(
    async (tutorialId) => {
      if (!tutorialId) return;
      const nextCompletedTutorials = { ...completedTutorials };
      delete nextCompletedTutorials[tutorialId];
      setCompletedTutorials(nextCompletedTutorials);
      await persistCompletedTutorials(nextCompletedTutorials);
    },
    [completedTutorials, persistCompletedTutorials],
  );

  // ******************EXPORTS**********************
  const value = useMemo(
    () => ({
      completedTutorials,
      activeTutorialId,
      startTutorial,
      stopTutorial,
      completeTutorial,
      resetTutorial,
      shouldShowTutorial,
    }),
    [
      completedTutorials,
      activeTutorialId,
      startTutorial,
      stopTutorial,
      completeTutorial,
      resetTutorial,
      shouldShowTutorial,
    ],
  );

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = React.useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};

export default TutorialProvider;
