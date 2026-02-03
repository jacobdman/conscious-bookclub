import React, { useMemo } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useMediaQuery, useTheme } from '@mui/material';
import useTutorial from 'contexts/Tutorial';

const DashboardTour = () => {
  const { shouldShowTutorial, completeTutorial, activeTutorialId } = useTutorial();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const tutorialId = 'dashboard';

  const steps = useMemo(() => {
    const baseSteps = [
      {
        target: 'body',
        content: 'Welcome to your dashboard! Here’s a quick tour of the main sections.',
        placement: 'center',
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-leaderboard"]',
        content: 'See club members and their consistency with Habit goals.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-member-profile"]',
        content: 'Tap on a member\'s profile picture to see their goal progress and activity.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-meeting"]',
        content: 'Keep track of upcoming meetings and what’s on deck.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-goals"]',
        content: 'Quickly track and update your personal goals for today.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-books-title"]',
        content: 'Review upcoming books and update your reading progress.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '[data-tour="dashboard-feed"]',
        content: 'Catch recent club activity and updates in the feed preview.',
        disableBeacon: true,
      },
    ];

    if (isMobile) {
      baseSteps.push({
        target: '[data-tour="nav-container"]',
        content: 'Use the bottom navigation to move between Home, Feed, Goals, and Books.',
        placement: 'top',
        disableBeacon: true,
      });
    }

    return baseSteps;
  }, [isMobile]);

  const run = shouldShowTutorial(tutorialId) || activeTutorialId === tutorialId;

  const handleCallback = (data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTutorial(tutorialId);
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton
      scrollToFirstStep
      spotlightClicks
      styles={{
        options: {
          zIndex: 1500,
        },
      }}
      callback={handleCallback}
    />
  );
};

export default DashboardTour;
