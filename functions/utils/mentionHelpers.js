/**
 * Shared constants and utilities for mention/tagging functionality
 * Backend version (for Cloud Functions)
 */

// Regex pattern for matching encoded mentions: @[displayName](userId)
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse mention patterns in text and extract user IDs
 * 
 * @param {string} text - The text containing mentions
 * @returns {Object} - { userIds: string[], displayText: string }
 */
const parseMentions = (text) => {
  if (!text) return {userIds: [], displayText: text};

  const userIds = [];
  let match;
  const regex = new RegExp(MENTION_REGEX);

  while ((match = regex.exec(text)) !== null) {
    const userId = match[2];
    if (userId && !userIds.includes(userId)) {
      userIds.push(userId);
    }
  }

  // Convert to display format (remove markdown syntax)
  const displayText = text.replace(new RegExp(MENTION_REGEX), "@$1");

  return {userIds, displayText};
};

module.exports = {
  MENTION_REGEX,
  parseMentions,
};
