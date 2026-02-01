export const DASHBOARD_SECTIONS = [
  {id: "habitLeaderboard", label: "Habit Leaderboard"},
  {id: "nextMeeting", label: "Next Meeting"},
  {id: "quickGoals", label: "Quick Goals"},
  {id: "quote", label: "Quote"},
  {id: "upcomingBooks", label: "Upcoming Books"},
  {id: "feed", label: "Feed"},
];

export const getDefaultDashboardConfig = () =>
  DASHBOARD_SECTIONS.map(({id}) => ({id, enabled: true}));

export const getDashboardConfigForFeatures = (features = {}) => {
  const resolved = {
    books: true,
    goals: true,
    quotes: true,
    ...features,
  };

  return getDefaultDashboardConfig().map((section) => {
    if (section.id === 'upcomingBooks' && !resolved.books) {
      return { ...section, enabled: false };
    }
    if ((section.id === 'quickGoals' || section.id === 'habitLeaderboard') && !resolved.goals) {
      return { ...section, enabled: false };
    }
    if (section.id === 'quote' && !resolved.quotes) {
      return { ...section, enabled: false };
    }
    return section;
  });
};

const coerceArrayConfig = (config) => {
  if (Array.isArray(config)) return config;

  // Backward compatibility for object shape { order, sections }
  if (config && (Array.isArray(config.order) || config.sections)) {
    const order = Array.isArray(config.order) ? config.order : [];
    const sections = config.sections || {};

    const mapped = order
      .filter((id) => DASHBOARD_SECTIONS.some((section) => section.id === id))
      .map((id) => ({
        id,
        enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
      }));

    DASHBOARD_SECTIONS.forEach(({id}) => {
      if (!mapped.find((item) => item.id === id)) {
        mapped.push({
          id,
          enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
        });
      }
    });

    return mapped;
  }

  return [];
};

export const sanitizeDashboardConfig = (config = []) => {
  const arrayConfig = coerceArrayConfig(config);
  const seen = new Set();
  const sanitized = [];

  arrayConfig.forEach((item) => {
    if (!item || !item.id || !DASHBOARD_SECTIONS.some((section) => section.id === item.id)) {
      return;
    }
    if (seen.has(item.id)) return;

    sanitized.push({
      id: item.id,
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    });
    seen.add(item.id);
  });

  getDefaultDashboardConfig().forEach((item) => {
    if (!seen.has(item.id)) {
      sanitized.push({...item});
    }
  });

  return sanitized;
};

export const isSectionEnabled = (configArray, sectionId) =>
  Array.isArray(configArray)
    ? !!configArray.find((item) => item.id === sectionId && item.enabled !== false)
    : true;
