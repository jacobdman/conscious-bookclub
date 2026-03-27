import React, { useMemo } from 'react';
import { Joyride } from 'react-joyride';
import useTutorial from 'contexts/Tutorial';
import { shouldCompleteTutorialFromJoyrideEvent } from 'utils/joyrideOnEvent';

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

  const handleEvent = (data) => {
    if (shouldCompleteTutorialFromJoyrideEvent(data)) {
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
      onEvent={handleEvent}
    />
  );
};

export default MenuTour;
