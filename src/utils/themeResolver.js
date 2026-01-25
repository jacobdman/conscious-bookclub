import { alpha } from '@mui/material/styles';
// Utils
import { CLUB_THEME_PRESETS, getPresetForOverrides } from 'utils/clubThemePresets';

/**
 * Gets preset overrides for a specific mode (light/dark)
 */
export const getPresetOverrides = (presetId, mode) => {
  if (!presetId) return null;
  const preset = CLUB_THEME_PRESETS.find((item) => item.id === presetId);
  if (!preset) return null;
  return preset.overrides?.[mode] ?? preset.overrides?.light ?? {};
};

/**
 * Builds dark mode palette defaults
 */
export const buildDarkPaletteDefaults = (palette = {}) => {
  const textPrimary = '#F5F1EA';
  const textSecondary = alpha(textPrimary, 0.72);
  const backgroundDefault = '#181512';
  const backgroundPaper = '#221C17';
  const divider = alpha(textPrimary, 0.12);

  const selectedBase = palette.primary?.light || palette.primary?.main || textPrimary;
  const action = {
    ...palette.action,
    active: palette.action?.active || textSecondary,
    hover: palette.action?.hover || alpha(textPrimary, 0.08),
    selected: alpha(selectedBase, 0.2),
    disabled: palette.action?.disabled || alpha(textPrimary, 0.36),
    disabledBackground: palette.action?.disabledBackground || alpha(textPrimary, 0.18),
    focus: palette.action?.focus || alpha(textPrimary, 0.12),
  };

  return {
    ...palette,
    mode: 'dark',
    text: {
      primary: textPrimary,
      secondary: textSecondary,
    },
    background: {
      default: backgroundDefault,
      paper: backgroundPaper,
    },
    divider,
    action,
  };
};

/**
 * Builds club theme overrides with dark mode palette defaults
 */
export const buildClubDarkOverrides = (overrides = {}) => ({
  ...overrides,
  palette: buildDarkPaletteDefaults(overrides?.palette || {}),
});

/**
 * Builds club theme overrides with light mode
 */
export const buildClubLightOverrides = (overrides = {}) => ({
  ...overrides,
  palette: {
    ...(overrides?.palette || {}),
    mode: 'light',
  },
});

/**
 * Gets the club's mode (light/dark) from theme overrides
 */
export const getClubModeFromOverrides = (overrides = {}) => {
  const presetMatch = getPresetForOverrides(overrides || {});
  if (presetMatch?.mode) {
    return presetMatch.mode;
  }
  return overrides?.palette?.mode === 'dark' ? 'dark' : 'light';
};

/**
 * Resolves the effective theme overrides based on club settings and user preferences
 * 
 * @param {Object} clubOverrides - The club's base theme overrides
 * @param {Object} userThemeOverride - The user's theme preference override
 * @param {string} userThemeOverride.preference - 'club' or 'preset'
 * @param {string} userThemeOverride.mode - 'club', 'light', or 'dark'
 * @param {string} userThemeOverride.presetId - Selected preset ID (when preference is 'preset')
 * @returns {Object} The resolved theme overrides to apply
 */
export const resolveThemeOverrides = (clubOverrides = {}, userThemeOverride) => {
  // If user hasn't set a preference or explicitly chose 'club', use club theme
  if (!userThemeOverride || userThemeOverride.preference === 'club' || !userThemeOverride.preference) {
    // User wants to use club theme but force dark mode
    if (userThemeOverride?.mode === 'dark') {
      const presetMatch = getPresetForOverrides(clubOverrides || {});
      const darkPresetOverrides = presetMatch?.preset?.overrides?.dark;
      if (darkPresetOverrides) {
        return darkPresetOverrides;
      }
      return buildClubDarkOverrides(clubOverrides);
    }
    
    // User wants to use club theme but force light mode
    if (userThemeOverride?.mode === 'light') {
      const presetMatch = getPresetForOverrides(clubOverrides || {});
      const lightPresetOverrides = presetMatch?.preset?.overrides?.light;
      if (lightPresetOverrides) {
        return lightPresetOverrides;
      }
      return buildClubLightOverrides(clubOverrides);
    }
    
    // User follows club theme as-is
    return clubOverrides;
  }

  // User chose to use a custom preset
  if (userThemeOverride.preference === 'preset') {
    const desiredMode =
      userThemeOverride.mode === 'club' || !userThemeOverride.mode
        ? getClubModeFromOverrides(clubOverrides)
        : userThemeOverride.mode;
    const presetOverrides = getPresetOverrides(userThemeOverride.presetId, desiredMode);
    return presetOverrides || clubOverrides;
  }

  // Fallback to club overrides
  return clubOverrides;
};
