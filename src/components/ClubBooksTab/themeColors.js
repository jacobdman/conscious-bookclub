// Theme color mapping for CBC design system
const THEME_COLORS = {
  Classy: '#8B7355', // Elegant brown/tan
  Creative: '#FF6B6B', // Vibrant coral/red
  Curious: '#4ECDC4', // Inquisitive teal/cyan
};

// Default color for books without a theme
const DEFAULT_COLOR = '#9E9E9E'; // Gray

/**
 * Get color for a book theme
 * @param {string|string[]|null} theme - Book theme(s)
 * @returns {string} Color hex code
 */
export const getThemeColor = (theme) => {
  if (!theme) {
    return DEFAULT_COLOR;
  }

  // If theme is an array, use the first theme
  const themeValue = Array.isArray(theme) ? theme[0] : theme;

  // Return mapped color or default
  return THEME_COLORS[themeValue] || DEFAULT_COLOR;
};

export default THEME_COLORS;

