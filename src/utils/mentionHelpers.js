/**
 * Shared constants and utilities for mention/tagging functionality
 */

import React from 'react';
import FeedLink from 'components/FeedLink';

// Regex pattern for matching encoded mentions: @[displayName](userId)
export const MENTION_REGEX = /@\[([^\]]+)\]\(([^)]+)\)/g;

// URL pattern for link detection (http/https, trim trailing punctuation when used as href)
export const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

// Email and phone patterns for "copy link" (first match by position)
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /\+?[\d][\d\s\-().]{8,}\d/g;

/**
 * Extract the first link-like string from text (URL, email, or phone), by position.
 * @param {string} text
 * @returns {string|null}
 */
export const extractFirstLink = (text) => {
  if (!text || typeof text !== 'string') return null;
  let first = null;
  let minIndex = Infinity;
  const tryRegex = (regex) => {
    const re = new RegExp(regex.source, 'g');
    let m;
    while ((m = re.exec(text)) !== null) {
      const trimmed = m[0].replace(/[.,;:!?)'"\]]+$/, '');
      if (trimmed && m.index < minIndex) {
        minIndex = m.index;
        first = trimmed;
      }
    }
  };
  tryRegex(URL_REGEX);
  tryRegex(EMAIL_REGEX);
  tryRegex(PHONE_REGEX);
  return first;
};

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
 * Collect all mention and URL matches, sorted by start index; drop overlaps (keep first by start).
 * @returns {Array<{ type: 'mention'|'url', start: number, end: number, ... }>}
 */
const getMentionAndUrlMatches = (text) => {
  const matches = [];
  let m;
  const mentionRe = new RegExp(MENTION_REGEX.source, 'g');
  while ((m = mentionRe.exec(text)) !== null) {
    matches.push({
      type: 'mention',
      start: m.index,
      end: m.index + m[0].length,
      displayName: m[1],
    });
  }
  const urlRe = new RegExp(URL_REGEX.source, 'g');
  while ((m = urlRe.exec(text)) !== null) {
    matches.push({
      type: 'url',
      start: m.index,
      end: m.index + m[0].length,
      raw: m[0],
    });
  }
  matches.sort((a, b) => a.start - b.start);
  const nonOverlapping = [];
  for (const match of matches) {
    if (nonOverlapping.length && match.start < nonOverlapping[nonOverlapping.length - 1].end) {
      continue;
    }
    nonOverlapping.push(match);
  }
  return nonOverlapping;
};

/**
 * Trim trailing punctuation from a URL for use as href (keeps path/search/hash punctuation).
 */
const trimUrlTrailingPunctuation = (url) => url.replace(/[.,;:!?)'"\]]+$/, '');

/**
 * Render mentions and links in text as React components (bold mentions, clickable links).
 *
 * @param {string} text - Text with encoded mentions and optional URLs
 * @returns {Array} - Array of text/JSX elements
 */
export const renderMentions = (text) => {
  if (!text) return [text];

  const matches = getMentionAndUrlMatches(text);
  if (matches.length === 0) return [text];

  const parts = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of matches) {
    if (match.start > lastIndex) {
      parts.push(text.slice(lastIndex, match.start));
    }
    if (match.type === 'mention') {
      parts.push(
        <strong key={`mention-${key++}`}>@{match.displayName}</strong>
      );
    } else if (match.type === 'url') {
      const href = trimUrlTrailingPunctuation(match.raw);
      parts.push(
        <FeedLink
          key={`link-${key++}`}
          href={href}
          displayText={match.raw}
        />
      );
    }
    lastIndex = match.end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};
