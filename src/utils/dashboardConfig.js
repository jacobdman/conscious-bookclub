export const DASHBOARD_SECTIONS = [
  {id: "habitLeaderboard", label: "Habit Leaderboard"},
  {id: "nextMeeting", label: "Next Meeting"},
  {id: "clubGoals", label: "Club goals"},
  {id: "quickGoals", label: "Quick Goals"},
  {id: "quote", label: "Quote"},
  {id: "upcomingBooks", label: "Upcoming Books"},
  {id: "feed", label: "Feed"},
];

const LEGACY_SECTION_IDS = {
  clubGoalSpotlight: "clubGoals",
};

export const normalizeDashboardSectionId = (id) =>
  LEGACY_SECTION_IDS[id] || id;

const isKnownSectionId = (id) => {
  const normalized = normalizeDashboardSectionId(id);
  return DASHBOARD_SECTIONS.some((section) => section.id === normalized);
};

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
    if (
      (section.id === 'quickGoals' ||
        section.id === 'habitLeaderboard' ||
        section.id === 'clubGoals') &&
      !resolved.goals
    ) {
      return { ...section, enabled: false };
    }
    if (section.id === 'quote' && !resolved.quotes) {
      return { ...section, enabled: false };
    }
    return section;
  });
};

const getCanonicalSectionIndex = (sectionId) =>
  DASHBOARD_SECTIONS.findIndex((section) => section.id === sectionId);

const insertMissingDashboardSections = (sections) => {
  const seen = new Set(sections.map((item) => item.id));
  const result = [...sections];

  getDefaultDashboardConfig().forEach((defaultSection) => {
    if (seen.has(defaultSection.id)) {
      return;
    }

    const canonicalIdx = getCanonicalSectionIndex(defaultSection.id);
    let insertAt = result.length;

    for (let i = 0; i < result.length; i += 1) {
      const existingIdx = getCanonicalSectionIndex(result[i].id);
      if (existingIdx > canonicalIdx) {
        insertAt = i;
        break;
      }
    }

    result.splice(insertAt, 0, {...defaultSection});
    seen.add(defaultSection.id);
  });

  return result;
};

const coerceArrayConfig = (config) => {
  if (Array.isArray(config)) {
    return config.map((item) => {
      if (!item || !item.id) return item;
      return {
        ...item,
        id: normalizeDashboardSectionId(item.id),
      };
    });
  }

  // Backward compatibility for object shape { order, sections }
  if (config && (Array.isArray(config.order) || config.sections)) {
    const order = Array.isArray(config.order) ? config.order : [];
    const sections = config.sections || {};

    const mapped = order
      .filter((id) => isKnownSectionId(id))
      .map((id) => {
        const normalizedId = normalizeDashboardSectionId(id);
        const legacyKey = id !== normalizedId ? id : normalizedId;
        return {
          id: normalizedId,
          enabled:
            typeof sections[normalizedId]?.enabled === "boolean" ?
              sections[normalizedId].enabled :
              typeof sections[legacyKey]?.enabled === "boolean" ?
                sections[legacyKey].enabled :
                true,
        };
      });

    return insertMissingDashboardSections(mapped);
  }

  return [];
};

export const sanitizeDashboardConfig = (config = []) => {
  const arrayConfig = coerceArrayConfig(config);
  const seen = new Set();
  const sanitized = [];

  arrayConfig.forEach((item) => {
    if (!item || !item.id) return;
    const id = normalizeDashboardSectionId(item.id);
    if (!DASHBOARD_SECTIONS.some((section) => section.id === id)) {
      return;
    }
    if (seen.has(id)) return;

    sanitized.push({
      id,
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    });
    seen.add(id);
  });

  return insertMissingDashboardSections(sanitized);
};

export const isSectionEnabled = (configArray, sectionId) =>
  Array.isArray(configArray)
    ? !!configArray.find((item) => item.id === sectionId && item.enabled !== false)
    : true;
