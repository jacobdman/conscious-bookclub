export const DEFAULT_CLUB_FEATURES = {
  themes: true,
  books: true,
  goals: true,
  quotes: true,
};

export const getClubFeatures = (club) => {
  const featureOverrides = club?.config?.features || {};
  return {
    ...DEFAULT_CLUB_FEATURES,
    ...featureOverrides,
  };
};
