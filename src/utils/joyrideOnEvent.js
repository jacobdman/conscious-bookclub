import { EVENTS, STATUS } from 'react-joyride';

/**
 * react-joyride v3 uses `onEvent`, not `callback`. Call from each tour's onEvent handler.
 */
export const shouldCompleteTutorialFromJoyrideEvent = (data) => {
  const { type, status } = data;
  return (
    type === EVENTS.TOUR_END
    || status === STATUS.FINISHED
    || status === STATUS.SKIPPED
  );
};
