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

