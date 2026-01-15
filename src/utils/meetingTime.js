import moment from 'moment-timezone';

const DEFAULT_TZ = 'UTC';

const isValidTz = (tz) => !!tz && moment.tz.zone(tz) !== null;

const resolveTimezone = (timezone, fallbackTz = DEFAULT_TZ) =>
  isValidTz(timezone) ? timezone : fallbackTz;

export const buildMeetingMoments = ({
  date,
  startTime,
  timezone,
  fallbackTimezone,
}) => {
  const tz = resolveTimezone(timezone, fallbackTimezone);

  // Interpret stored date/startTime in the meeting's timezone (host intent).
  if (date) {
    const time = startTime || '00:00:00';
    const host = moment.tz(`${date}T${time}`, tz);
    const viewerLocal = host.clone().local();
    return {
      host,
      viewerLocal,
      timezone: tz,
      hasStartTime: !!startTime,
    };
  }

  return {
    host: null,
    viewerLocal: null,
    timezone: tz,
    hasStartTime: !!startTime,
  };
};

export const formatMeetingDisplay = ({
  date,
  startTime,
  timezone,
  fallbackTimezone,
}) => {
  const { host, viewerLocal, timezone: tz, hasStartTime } = buildMeetingMoments({
    date,
    startTime,
    timezone,
    fallbackTimezone,
  });

  const formatDate = (m) => (m ? m.format('MMM D, YYYY') : '');
  const formatTime = (m) => (m ? m.format('h:mm A') : '');

  const hostDate = formatDate(host);
  const hostTime = hasStartTime ? formatTime(host) : '';
  const viewerDate = formatDate(viewerLocal);
  const viewerTime = hasStartTime ? formatTime(viewerLocal) : '';

  return {
    hostDate,
    hostTime,
    hostLabel: tz,
    viewerDate,
    viewerTime,
  };
};

export const getBrowserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
};
