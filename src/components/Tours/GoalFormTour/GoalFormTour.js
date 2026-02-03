import React, { useMemo } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import useTutorial from 'contexts/Tutorial';

const GoalFormTour = ({ open }) => {
  const { shouldShowTutorial, completeTutorial, activeTutorialId } = useTutorial();
  const tutorialId = 'goal-form';

  const steps = useMemo(
    () => [
      {
        target: '[data-tour="goal-form-type"]',
        content: (
          <div>
            <div><strong>Habit</strong>: do something consistently over a period of time.</div>
            <div><strong>Metric</strong>: track a quantity per period (miles, pages, hours).</div>
            <div><strong>One-time</strong>: a single task with an optional due date.</div>
            <div><strong>Milestone</strong>: a sequence of steps toward a larger goal.</div>
          </div>
        ),
        disableBeacon: true,
        placement: 'bottom',
      },
      {
        target: '[data-tour="goal-form-content"]',
        content: (
          <div>
            <div>If you’re not sure if it’s a habit or a metric, ask yourself: “Is it about doing it regularly, or about the amount?”</div>
            <div>Try not to double goal—avoid creating both a milestone and a one-time goal for the same outcome.</div>
          </div>
        ),
        disableBeacon: true,
        placement: 'top',
      },
    ],
    [],
  );

  const run = open && (shouldShowTutorial(tutorialId) || activeTutorialId === tutorialId);

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
      scrollToFirstStep={false}
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

export default GoalFormTour;
