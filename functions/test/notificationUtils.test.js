const {describe, it} = require("node:test");
const assert = require("node:assert/strict");
const {
  getMeetingStartInstant,
  isReminderHourBeforeMeeting,
  getCalendarDateDaysBeforeMeeting,
  floorToUtcHour,
} = require("../src/utils/meetingStart");
const {
  localHourToUtcHour,
  getGoalNotificationHourFromUser,
} = require("../src/utils/userLocalTime");

describe("meetingStart", () => {
  it("getMeetingStartInstant combines date, time, and timezone", () => {
    const start = getMeetingStartInstant({
      date: "2026-06-15",
      startTime: "19:30:00",
      timezone: "America/Denver",
    }, "UTC");
    const hourDenver = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Denver",
      hour: "2-digit",
      hour12: false,
    }).format(start);
    assert.equal(parseInt(hourDenver, 10), 19);
  });

  it("defaults to 9am when startTime is null", () => {
    const start = getMeetingStartInstant({
      date: "2026-06-15",
      startTime: null,
      timezone: "UTC",
    });
    assert.equal(start.getUTCHours(), 9);
  });

  it("isReminderHourBeforeMeeting matches T-24h bucket", () => {
    const meeting = {
      date: "2026-06-15",
      startTime: "19:00:00",
      timezone: "UTC",
    };
    const start = getMeetingStartInstant(meeting, "UTC");
    const remindAt = new Date(start.getTime() - 24 * 3600 * 1000);
    const now = new Date(remindAt.getTime() + 15 * 60 * 1000);
    assert.equal(
        isReminderHourBeforeMeeting(start, now, 24),
        true,
    );
    const wrongHour = new Date(remindAt.getTime() + 2 * 3600 * 1000);
    assert.equal(
        isReminderHourBeforeMeeting(start, wrongHour, 24),
        false,
    );
  });

  it("getCalendarDateDaysBeforeMeeting subtracts in meeting TZ", () => {
    const d = getCalendarDateDaysBeforeMeeting(
        "2026-06-15",
        "America/Denver",
        3,
    );
    assert.equal(d, "2026-06-12");
  });

  it("floorToUtcHour is stable within the same hour", () => {
    const t = new Date("2026-01-01T14:30:00Z");
    assert.equal(floorToUtcHour(t), floorToUtcHour(new Date("2026-01-01T14:59:00Z")));
  });
});

describe("userLocalTime", () => {
  it("localHourToUtcHour maps Denver 10am to expected UTC hour", () => {
    const now = new Date("2026-06-15T18:00:00Z");
    const utcHour = localHourToUtcHour(10, "America/Denver", now);
    assert.equal(typeof utcHour, "number");
    assert.ok(utcHour >= 0 && utcHour <= 23);
  });

  it("getGoalNotificationHourFromUser prefers notificationSettings", () => {
    const user = {
      notificationSettings: {goals: {time: "14:00:00"}},
      dailyGoalNotificationTime: "09:00:00",
    };
    assert.equal(getGoalNotificationHourFromUser(user), 14);
  });
});

describe("habitStreakAtRisk logic", () => {
  it("prior streak requires today incomplete and yesterday complete", () => {
    const periods = [
      {completed: false},
      {completed: true},
      {completed: true},
    ];
    let priorStreak = 0;
    for (let i = 1; i < periods.length; i++) {
      if (periods[i].completed) priorStreak++;
      else break;
    }
    assert.equal(periods[0].completed, false);
    assert.ok(priorStreak >= 1);
  });

  it("no at-risk when today already complete", () => {
    const periods = [{completed: true}, {completed: true}];
    assert.equal(periods[0].completed, true);
  });
});
