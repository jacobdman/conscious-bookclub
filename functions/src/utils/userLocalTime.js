/**
 * User timezone helpers for scheduled notifications.
 */

/**
 * @param {object|null|undefined} user User row with optional timezone
 * @return {string} IANA timezone
 */
const getUserTimezone = (user) => user?.timezone || "UTC";

/**
 * @param {string} timezone IANA timezone
 * @param {Date} [now]
 * @return {number} Local hour 0-23
 */
const getLocalHour = (timezone, now = new Date()) => {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const [hour] = formatted.split(":").map(Number);
  return hour;
};

/**
 * @param {string} timezone IANA timezone
 * @param {Date} [now]
 * @return {string} YYYY-MM-DD in that timezone
 */
const getLocalDateString = (timezone, now = new Date()) => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
};

/**
 * @param {object|null|undefined} user User row
 * @param {Date} [now]
 * @return {number} Local hour 0-23
 */
const getUserLocalHour = (user, now = new Date()) =>
  getLocalHour(getUserTimezone(user), now);

/**
 * @param {object|null|undefined} user User row
 * @param {Date} [now]
 * @return {string} YYYY-MM-DD
 */
const getUserLocalDateString = (user, now = new Date()) =>
  getLocalDateString(getUserTimezone(user), now);

/**
 * @param {object|null|undefined} user User row
 * @param {number} targetHour Local hour 0-23
 * @param {Date} [now]
 * @return {boolean}
 */
const isUserLocalHour = (user, targetHour, now = new Date()) =>
  getUserLocalHour(user, now) === targetHour;

/**
 * Offset in hours: localHour - 12 when UTC is noon on the given calendar day.
 * @param {string} timezone IANA timezone
 * @param {Date} [now]
 * @return {number}
 */
const getTimezoneOffsetHours = (timezone, now = new Date()) => {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const testUTC = new Date(Date.UTC(year, month, day, 12, 0, 0));
  const testInTz = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    hour12: false,
  }).format(testUTC);
  const [testHour] = testInTz.split(":").map(Number);
  return testHour - 12;
};

/**
 * Convert a local hour on the user's calendar day to the UTC hour (0-23) when cron runs.
 * @param {number} localHour 0-23
 * @param {string} timezone IANA timezone
 * @param {Date} [now]
 * @return {number}
 */
const localHourToUtcHour = (localHour, timezone, now = new Date()) => {
  const tzOffset = getTimezoneOffsetHours(timezone, now);
  return (localHour - tzOffset + 24) % 24;
};

/**
 * @param {object} user User row
 * @return {number|null} Local notification hour or null if unset
 */
const getGoalNotificationHourFromUser = (user) => {
  const settingsTime = user.notificationSettings?.goals?.time;
  const legacyTime = user.dailyGoalNotificationTime;
  const timeStr = settingsTime || legacyTime;
  if (!timeStr) return null;
  const [hours] = String(timeStr).split(":").map(Number);
  return Number.isFinite(hours) ? hours : null;
};

/**
 * @param {object} user User row
 * @param {Date} now
 * @param {number} currentUtcHour
 * @return {boolean}
 */
const isUserGoalReminderUtcHour = (user, now, currentUtcHour) => {
  const hours = getGoalNotificationHourFromUser(user);
  if (hours == null) return false;
  const tz = getUserTimezone(user);
  const targetHourUTC = localHourToUtcHour(hours, tz, now);
  return currentUtcHour === targetHourUTC;
};

module.exports = {
  getUserTimezone,
  getLocalHour,
  getLocalDateString,
  getUserLocalHour,
  getUserLocalDateString,
  isUserLocalHour,
  getTimezoneOffsetHours,
  localHourToUtcHour,
  getGoalNotificationHourFromUser,
  isUserGoalReminderUtcHour,
};
