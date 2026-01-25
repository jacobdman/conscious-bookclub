/**
 * Shared constants and utilities for mention/tagging functionality
 */

// Regex pattern for matching encoded mentions: @[displayName](userId)
export const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Parse mention patterns in text and extract user IDs
 * 
 * @param {string} text - The text containing mentions
 * @returns {Object} - { userIds: string[], displayText: string }
 */
export const parseMentions = (text) => {
  if (!text) return { userIds: [], displayText: text };

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
  const displayText = text.replace(MENTION_REGEX, '@$1');

  return { userIds, displayText };
};

/**
 * Convert text with mentions metadata to stored format
 * Format: @[displayName](userId)
 * 
 * @param {string} text - The plain text
 * @param {Array} mentions - Array of {userId, displayName, start, end}
 * @returns {string} - Text with mention markup
 */
export const encodeMentions = (text, mentions = []) => {
  if (!text || !mentions || mentions.length === 0) {
    return text;
  }

  // Sort mentions by start position (descending) to replace from end to beginning
  const sortedMentions = [...mentions].sort((a, b) => b.start - a.start);
  
  let result = text;
  for (const mention of sortedMentions) {
    const { userId, displayName, start, end } = mention;
    const mentionText = result.slice(start, end);
    
    // Only encode if the text still looks like a mention
    if (mentionText.startsWith('@')) {
      const encoded = `@[${displayName}](${userId})`;
      result = result.slice(0, start) + encoded + result.slice(end);
    }
  }

  return result;
};

/**
 * Render mentions in text as React components with bold styling
 * 
 * @param {string} text - Text with encoded mentions
 * @returns {Array} - Array of text/JSX elements
 */
export const renderMentions = (text) => {
  if (!text) return [text];

  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  const regex = new RegExp(MENTION_REGEX);

  while ((match = regex.exec(text)) !== null) {
    // Add text before mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add mention as bold text
    const displayName = match[1];
    parts.push(
      <strong key={`mention-${key++}`}>@{displayName}</strong>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};
