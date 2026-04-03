/**
 * Swipe / discover queue metadata (shared by QueueSelector and SwipeCard).
 */
export const SWIPE_QUEUES = [
  { id: 'discover', emoji: '✨', label: 'Discover', hint: 'Find your next great read' },
  { id: 'hot', emoji: '🔥', label: 'Hot Picks', hint: 'Almost in the backlog' },
  { id: 'champion', emoji: '🏆', label: 'Champion Picks', hint: 'Backed by your club' },
  { id: 'bookmarked', emoji: '🔖', label: 'Bookmarked', hint: 'Saved for later' },
  { id: 'backlog_review', emoji: '📋', label: 'Backlog Review', hint: 'Keep your backlog fresh' },
];

const DEFAULT_QUEUE = SWIPE_QUEUES[0];

/**
 * @param {string} [queueId]
 * @returns {{ id: string, emoji: string, label: string, hint: string }}
 */
export const getSwipeQueueMeta = (queueId) =>
  SWIPE_QUEUES.find((q) => q.id === queueId) || DEFAULT_QUEUE;
