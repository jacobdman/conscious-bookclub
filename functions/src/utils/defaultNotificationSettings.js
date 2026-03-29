/**
 * Default notification preferences for new users and helpers for opt-out semantics:
 * boolean flags are treated as enabled unless explicitly `false`; `feed.mode` defaults to `all`.
 */

const DEFAULT_NOTIFICATION_SETTINGS = {
  goals: {
    enabled: true,
    time: "09:00:00",
  },
  feed: {
    enabled: true,
    mode: "all",
    reactions: true,
  },
  meetings: {
    enabled: true,
    oneWeekBefore: true,
    oneDayBefore: true,
  },
};

/**
 * @param {object|undefined} feedSettings - notificationSettings.feed
 * @return {boolean}
 */
const feedNotificationsEnabled = (feedSettings) =>
  feedSettings?.enabled !== false;

/**
 * @param {object|undefined} feedSettings - notificationSettings.feed
 * @return {'all'|'mentions_replies'}
 */
const feedMode = (feedSettings) => feedSettings?.mode ?? "all";

/**
 * @param {object|undefined} feedSettings - notificationSettings.feed
 * @return {boolean}
 */
const feedReactionsEnabled = (feedSettings) =>
  feedSettings?.reactions !== false;

/**
 * Daily goal pushes: JSON `goals.enabled` overrides legacy column when present.
 * @param {object} user User Sequelize row
 * @return {boolean}
 */
const goalsNotificationsEnabled = (user) => {
  const g = user.notificationSettings?.goals;
  if (g && Object.prototype.hasOwnProperty.call(g, "enabled")) {
    return g.enabled !== false;
  }
  return user.dailyGoalNotificationsEnabled !== false;
};

/**
 * @param {object|undefined} meetingsSettings - notificationSettings.meetings
 * @return {boolean}
 */
const meetingsNotificationsEnabled = (meetingsSettings) =>
  meetingsSettings?.enabled !== false;

/**
 * @param {object|undefined} meetingsSettings
 * @return {boolean}
 */
const meetingsOneDayBeforeEnabled = (meetingsSettings) =>
  meetingsSettings?.oneDayBefore !== false;

/**
 * @param {object|undefined} meetingsSettings
 * @return {boolean}
 */
const meetingsOneWeekBeforeEnabled = (meetingsSettings) =>
  meetingsSettings?.oneWeekBefore !== false;

module.exports = {
  DEFAULT_NOTIFICATION_SETTINGS,
  feedNotificationsEnabled,
  feedMode,
  feedReactionsEnabled,
  goalsNotificationsEnabled,
  meetingsNotificationsEnabled,
  meetingsOneDayBeforeEnabled,
  meetingsOneWeekBeforeEnabled,
};
