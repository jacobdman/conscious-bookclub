import React, { useMemo } from 'react';
import { Joyride } from 'react-joyride';
import useTutorial from 'contexts/Tutorial';
import { shouldCompleteTutorialFromJoyrideEvent } from 'utils/joyrideOnEvent';

const BooksTour = () => {
  const { shouldShowTutorial, completeTutorial, activeTutorialId } = useTutorial();
  const tutorialId = 'books';

  const steps = useMemo(
    () => [
      {
        target: '[data-tour="books-search"]',
        content: 'Search by title or author to quickly find a book.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="books-filter"]',
        content: 'Filter by theme, status, meeting schedule, or who suggested the book.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="add_book_button"]',
        content: 'Add new books to your club’s list from here.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="add_book_mobile_button"]',
        content: 'Add new books to your club’s list from here.',
        disableBeacon: true,
      },
      {
        target: '[data-tour="books-row"]',
        content: 'Tap a book row to open details and manage progress.',
        placement: 'bottom',
        disableBeacon: true,
      },
      {
        target: '[data-tour="books-like"]',
        content: 'Like a book to show interest and boost it for the club.',
        placement: 'bottom',
        disableBeacon: true,
      },
    ],
    [],
  );

  const run = shouldShowTutorial(tutorialId) || activeTutorialId === tutorialId;

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
      scrollOffset={80}
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

export default BooksTour;
