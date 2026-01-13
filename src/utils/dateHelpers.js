/**
 * Date utility functions for consistent local timezone handling
 */

/**
 * Parse a date string (YYYY-MM-DD) as local time at midnight
 * This prevents timezone conversion issues when parsing date-only strings
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} - Date object at midnight local time
 */
export const parseLocalDate = (dateString) => {
  if (!dateString) return null;
  
  // Split the date string into components
  const parts = dateString.split('-').map(Number);
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateString}. Expected YYYY-MM-DD`);
  }
  
  const [year, month, day] = parts;
  
  // Create date at midnight local time (month is 0-indexed)
  return new Date(year, month - 1, day, 0, 0, 0, 0);
};

/**
 * Format a Date object to YYYY-MM-DD string using local time components
 * This prevents timezone conversion issues when saving dates
 * @param {Date} date - Date object to format
 * @returns {string} - Date string in YYYY-MM-DD format
 */
export const formatLocalDate = (date) => {
  if (!date) return null;
  
  if (!(date instanceof Date)) {
    throw new Error('formatLocalDate expects a Date object');
  }
  
  // Use local time components to avoid timezone conversion
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Convert a date-like input to a Date object in local time.
 * @param {string|number|Date} value
 * @returns {Date|null}
 */
const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Format a time portion using local timezone.
 * @param {Date|string|number} value
 * @returns {string}
 */
export const formatLocalTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/**
 * Produce a semantic date label (local time) such as:
 * - "just now", "5 minutes ago", "2 hours ago"
 * - "Yesterday"
 * - Weekday name for dates within the past week
 * - "Dec 5" (or "Dec 5, 2024" if year differs)
 * @param {Date|string|number} value
 * @param {Date} [nowDate=new Date()]
 * @returns {string}
 */
export const formatSemanticDate = (value, nowDate = new Date()) => {
  const date = toDate(value);
  if (!date) return '';

  const now = toDate(nowDate);
  if (!now) return '';

  const diffMs = now.getTime() - date.getTime();

  // Future dates: fall back to calendar formatting
  if (diffMs < 0) {
    const yearOptions = date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' };
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...yearOptions });
  }

  const oneMinute = 60 * 1000;
  const oneHour = 60 * oneMinute;
  const oneDay = 24 * oneHour;

  if (diffMs < oneMinute) return 'just now';
  if (diffMs < oneHour) {
    const minutes = Math.max(1, Math.round(diffMs / oneMinute));
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }

  const isSameDay = date.toDateString() === now.toDateString();
  if (isSameDay) {
    const hours = Math.max(1, Math.round(diffMs / oneHour));
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.floor((startOfToday.getTime() - startOfDate.getTime()) / oneDay);

  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }

  const yearOptions = date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' };
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...yearOptions });
};

/**
 * Format a semantic date label alongside a local time string.
 * @param {Date|string|number} value
 * @param {Date} [nowDate=new Date()]
 * @returns {{ semanticDate: string, timeString: string, displayString: string }}
 */
export const formatSemanticDateTime = (value, nowDate = new Date()) => {
  const semanticDate = formatSemanticDate(value, nowDate);
  const timeString = formatLocalTime(value);
  const displayString = semanticDate && timeString ? `${semanticDate} | ${timeString}` : semanticDate || timeString;

  return { semanticDate, timeString, displayString };
};

