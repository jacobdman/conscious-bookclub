import React, { useMemo } from 'react';
import { Joyride } from 'react-joyride';
import useTutorial from 'contexts/Tutorial';
import { shouldCompleteTutorialFromJoyrideEvent } from 'utils/joyrideOnEvent';

const tutorialId = 'goalPauseRelease';

/**
 * Two-step explainer after "Show me how" on the goal-pause release dialog (no goal modal).
 */
const GoalPauseReleaseTour = () => {
  const { completeTutorial, activeTutorialId } = useTutorial();

  const run = activeTutorialId === tutorialId;

  const steps = useMemo(
    () => [
      {
        target: 'body',
        placement: 'center',
        disableBeacon: true,
        content:
          'Habit and metric goals can be paused when you need a break. While paused, those periods won’t count against you on habit consistency leaderboards, and you can’t add or edit entries until you resume.',
      },
      {
        target: 'body',
        placement: 'center',
        disableBeacon: true,
        content:
          'Open a habit or metric goal from Today’s Goals or the Goals tab. In the goal details footer, use Pause goal when you need a break (you’ll confirm), or Resume goal when you’re ready to log again—you can switch anytime.',
      },
    ],
    [],
  );

  const handleEvent = (data) => {
    if (shouldCompleteTutorialFromJoyrideEvent(data)) {
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
      onEvent={handleEvent}
    />
  );
};

export default GoalPauseReleaseTour;
