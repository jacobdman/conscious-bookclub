/**
 * April 1 display-only pranks. Delete this file and all imports to remove.
 */

export const isAprilFoolsDay = () => {
  const d = new Date();
  return d.getMonth() === 3 && d.getDate() === 1;
};

const PHRASES = [
  'fart in pants',
  'tell boss you love them',
  "ignore the gangstalkers... they aren't real",
  'hydrate exclusively with room-temperature LaCroix',
  'touch grass (court-ordered)',
  'reply-all to prove you exist',
  'maintain eye contact with the PDF',
  'pretend you read the book (method acting)',
  'debate the ending with your thermostat',
  'take a vow of silence until the recap',
  "log thoughts as prayers in the spreadsheet",
  'alphabetize the spice rack by emotional damage',
  'manifest a parking spot through sheer spite',
  'rate every bird you see out of ten',
  'learn the protagonist’s middle name or quit',
  'underline random sentences until it feels like studying',
  'say “interesting” at least forty times in the next meeting',
  'time-block “existential dread” before lunch',
  'replace all water with opinions',
  'become one with the footnotes',
  'audition new fonts for your inner monologue',
  'treat every notification like a small bird asking for bread',
  'journal in iambic pentameter (mandatory)',
  'stare at the cover until plot osmosis occurs',
  'schedule a one-on-one with the vending machine',
  'practice your “I loved it” face in the mirror',
  'collect evidence that the author has met a human',
  'rename your to-do list “the reckoning”',
  'only use words from the glossary for 24 hours',
  'file a bug report with your past self',
  'rotate your personality slightly clockwise',
  'thank the algorithm aloud before each scroll',
];

/** Per page load: random phrase index per goal, stable across re-renders. Real title: goal details modal. */
const loadPhraseIdxByGoalKey = new Map();

/**
 * April 1 only: always show a random silly phrase (real title in GoalDetailsModal only).
 * Phrase is picked once per goal per load—refresh for new picks.
 * @param {string} title - real goal title (unused when spoofing; kept for API)
 * @param {string|number} [goalId] - stable key (preferred)
 * @returns {string}
 */
export const aprilFoolsGoalTitle = (title, goalId) => {
  if (!isAprilFoolsDay()) return title;
  const key = goalId != null && goalId !== '' ? String(goalId) : String(title || '');
  if (!loadPhraseIdxByGoalKey.has(key)) {
    loadPhraseIdxByGoalKey.set(key, Math.floor(Math.random() * PHRASES.length));
  }
  return PHRASES[loadPhraseIdxByGoalKey.get(key)];
};
