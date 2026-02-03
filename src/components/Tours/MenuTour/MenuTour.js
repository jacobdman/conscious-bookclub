import React, { useMemo } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import useTutorial from 'contexts/Tutorial';

const MenuTour = ({ open, steps = [] }) => {
  const { shouldShowTutorial, completeTutorial, activeTutorialId } = useTutorial();
  const tutorialId = 'menu';

  const normalizedSteps = useMemo(
    () =>
      steps.map((step) => ({
        ...step,
        disableBeacon: true,
        placement: step.placement || 'right',
      })),
    [steps],
  );

  const run = open && normalizedSteps.length > 0 && (
    shouldShowTutorial(tutorialId) || activeTutorialId === tutorialId
  );

  const handleCallback = (data) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      completeTutorial(tutorialId);
    }
  };

  return (
    <Joyride
      steps={normalizedSteps}
      run={run}
      continuous
      showSkipButton
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

export default MenuTour;
