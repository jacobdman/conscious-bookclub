// Success message display duration (ms)
export const SUCCESS_MESSAGE_DURATION = 3000;

/**
 * Gets the mode label for display
 */
export const getModeLabel = (mode) => {
  if (mode === 'club') return 'Follow club mode';
  if (mode === 'dark') return 'Forced dark mode';
  return 'Forced light mode';
};

/**
 * Gets the scope label for display
 */
export const getScopeLabel = (selectedClubId, selectedClub) => {
  if (selectedClubId === 'all') return 'All clubs';
  return selectedClub?.name || 'Selected club';
};

/**
 * Gets the source label for display
 */
export const getSourceLabel = (preference, selectedPreset) => {
  if (preference === 'preset') {
    return `${selectedPreset?.name || 'Custom preset'} preset`;
  }
  return 'Club theme';
};

/**
 * Gets the club's current mode (light/dark)
 */
export const getClubMode = (club) => {
  return club?.themeOverrides?.palette?.mode === 'dark' ? 'dark' : 'light';
};
