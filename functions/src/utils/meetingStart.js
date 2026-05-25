const moment = require("moment-timezone");

/**
 * @param {object} meeting Meeting row (date, startTime, timezone)
 * @param {string} [fallbackTimezone] When meeting.timezone is null
 * @return {Date} Instant when the meeting starts
 */
const getMeetingStartInstant = (meeting, fallbackTimezone = "UTC") => {
  const tz = meeting.timezone || fallbackTimezone || "UTC";
  const dateStr = typeof meeting.date === "string" ?
    meeting.date :
    new Date(meeting.date).toISOString().split("T")[0];

  let timeStr = "09:00:00";
  if (meeting.startTime) {
    if (typeof meeting.startTime === "string") {
      timeStr = meeting.startTime;
    } else if (meeting.startTime instanceof Date) {
      timeStr = meeting.startTime.toISOString().slice(11, 19);
    } else {
      timeStr = String(meeting.startTime);
    }
  }

  const parts = timeStr.split(":");
  const hour = parseInt(parts[0], 10) || 9;
  const minute = parseInt(parts[1], 10) || 0;
  const second = parseInt(parts[2], 10) || 0;

  return moment.tz(dateStr, "YYYY-MM-DD", tz)
      .hour(hour)
      .minute(minute)
      .second(second)
      .millisecond(0)
      .toDate();
};

/**
 * @param {Date} instant
 * @return {number} Floor to UTC hour bucket (ms / 1h)
 */
const floorToUtcHour = (instant) =>
  Math.floor(new Date(instant).getTime() / (3600 * 1000));

/**
 * @param {Date} meetingStart
 * @param {Date} now
 * @param {number} hoursBefore e.g. 24 or 168 (7 days)
 * @return {boolean} True when `now` is in the same UTC hour as start - hoursBefore
 */
const isReminderHourBeforeMeeting = (meetingStart, now, hoursBefore) => {
  const remindAt = new Date(
      meetingStart.getTime() - hoursBefore * 3600 * 1000,
  );
  return floorToUtcHour(remindAt) === floorToUtcHour(now);
};

/**
 * Calendar date string for N days before meeting.date in the given timezone.
 * @param {string} meetingDateStr YYYY-MM-DD
 * @param {string} timezone IANA
 * @param {number} daysBefore 1 or 3
 * @return {string} YYYY-MM-DD
 */
const getCalendarDateDaysBeforeMeeting = (
    meetingDateStr,
    timezone,
    daysBefore,
) => {
  return moment.tz(meetingDateStr, "YYYY-MM-DD", timezone)
      .subtract(daysBefore, "days")
      .format("YYYY-MM-DD");
};

module.exports = {
  getMeetingStartInstant,
  floorToUtcHour,
  isReminderHourBeforeMeeting,
  getCalendarDateDaysBeforeMeeting,
};
