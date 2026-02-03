import React, { useMemo } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import useTutorial from 'contexts/Tutorial';

const GoalsTour = () => {
  const { shouldShowTutorial, completeTutorial, activeTutorialId } = useTutorial();
  const tutorialId = 'goals';

  const steps = useMemo(
    () => [
      {
        target: '[data-tour="goals-quick"]',
        content: 'Quickly track today’s goal progress at a glance. One tap will complete a goal.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="goals-table-header"]',
        content: 'All of your goals live here with type and progress details.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '[data-tour="goals-create"]',
        content: 'Create a goal and choose types like habit, metric, milestone, or one-time—each with its own cadence options.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="goals-tabs"]',
        content: 'Switch between your goals list and the goals report.',
        disableBeacon: true,
      },
    ],
    [],
  );

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

export default GoalsTour;
