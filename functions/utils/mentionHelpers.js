/**
 * Shared constants and utilities for mention/tagging functionality
 * Backend version (for Cloud Functions)
 */

// Regex pattern for matching encoded mentions: @[displayName](userId)
const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** Reserved mention id for @everyone; must stay in sync with src/utils/mentionHelpers.js */
const EVERYONE_MENTION_USER_ID = "__cbc_everyone__";

/**
 * Parse mention patterns in text and extract user IDs
 *
 * @param {string} text - The text containing mentions
 * @return {Object} - { userIds: string[], displayText: string }
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
  EVERYONE_MENTION_USER_ID,
};
