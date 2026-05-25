/* eslint-disable new-cap */

const DASHBOARD_SECTIONS = [
  "habitLeaderboard",
  "nextMeeting",
  "clubGoals",
  "quickGoals",
  "quote",
  "upcomingBooks",
  "feed",
];

const normalizeSectionId = (id) => (id === "clubGoalSpotlight" ? "clubGoals" : id);

/**
 * @param {Array<object>} config Dashboard section config items
 * @return {Array<object>} Normalized section config
 */
const normalizeArrayConfig = (config) => {
  const seen = new Set();
  const normalized = [];

  config.forEach((item) => {
    if (!item || !item.id) return;
    const id = normalizeSectionId(item.id);
    if (!DASHBOARD_SECTIONS.includes(id) || seen.has(id)) return;
    normalized.push({
      id,
      enabled: typeof item.enabled === "boolean" ? item.enabled : true,
    });
    seen.add(id);
  });

  return normalized;
};

/**
 * Insert clubGoals before quickGoals when missing; reorder when below quickGoals.
 * @param {Array<{id: string, enabled: boolean}>} config
 * @return {{config: Array<object>, changed: boolean}}
 */
const ensureClubGoalsSection = (config) => {
  const items = normalizeArrayConfig(config);
  let changed = JSON.stringify(items) !== JSON.stringify(config);

  const quickIdx = items.findIndex((item) => item.id === "quickGoals");
  const clubIdx = items.findIndex((item) => item.id === "clubGoals");

  if (clubIdx === -1) {
    const clubGoals = {id: "clubGoals", enabled: true};
    if (quickIdx >= 0) {
      items.splice(quickIdx, 0, clubGoals);
    } else {
      const nextMeetingIdx = items.findIndex((item) => item.id === "nextMeeting");
      const insertAt = nextMeetingIdx >= 0 ? nextMeetingIdx + 1 : items.length;
      items.splice(insertAt, 0, clubGoals);
    }
    return {config: items, changed: true};
  }

  if (quickIdx !== -1 && clubIdx > quickIdx) {
    const [clubItem] = items.splice(clubIdx, 1);
    const newQuickIdx = items.findIndex((item) => item.id === "quickGoals");
    items.splice(newQuickIdx, 0, clubItem);
    changed = true;
  }

  return {config: items, changed};
};

/**
 * @param {object} config
 * @return {{config: object, changed: boolean}}
 */
const ensureClubGoalsSectionLegacy = (config) => {
  const order = Array.isArray(config.order) ? [...config.order] : [];
  const sections = {...(config.sections || {})};

  if (sections.clubGoalSpotlight && !sections.clubGoals) {
    sections.clubGoals = sections.clubGoalSpotlight;
    delete sections.clubGoalSpotlight;
  }

  const normalizedOrder = order.map((id) => normalizeSectionId(id));
  const quickIdx = normalizedOrder.indexOf("quickGoals");
  const clubIdx = normalizedOrder.indexOf("clubGoals");

  let changed =
    JSON.stringify(order) !== JSON.stringify(normalizedOrder) ||
    !!config.sections?.clubGoalSpotlight;

  if (clubIdx === -1) {
    if (quickIdx >= 0) {
      normalizedOrder.splice(quickIdx, 0, "clubGoals");
    } else {
      const nextMeetingIdx = normalizedOrder.indexOf("nextMeeting");
      const insertAt =
        nextMeetingIdx >= 0 ? nextMeetingIdx + 1 : normalizedOrder.length;
      normalizedOrder.splice(insertAt, 0, "clubGoals");
    }
    if (typeof sections.clubGoals?.enabled !== "boolean") {
      sections.clubGoals = {enabled: true};
    }
    changed = true;
  } else if (quickIdx !== -1 && clubIdx > quickIdx) {
    normalizedOrder.splice(clubIdx, 1);
    const newQuickIdx = normalizedOrder.indexOf("quickGoals");
    normalizedOrder.splice(newQuickIdx, 0, "clubGoals");
    changed = true;
  }

  return {
    config: {order: normalizedOrder, sections},
    changed,
  };
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const clubs = await queryInterface.sequelize.query(
        "SELECT id, dashboard_config FROM clubs WHERE dashboard_config IS NOT NULL",
        {type: Sequelize.QueryTypes.SELECT},
    );

    for (const club of clubs) {
      const config = club.dashboard_config;
      if (!config) continue;

      let next = config;
      let changed = false;

      if (Array.isArray(config)) {
        const result = ensureClubGoalsSection(config);
        next = result.config;
        changed = result.changed;
      } else if (config.order || config.sections) {
        const result = ensureClubGoalsSectionLegacy(config);
        next = result.config;
        changed = result.changed;
      }

      if (!changed) continue;

      await queryInterface.sequelize.query(
          "UPDATE clubs SET dashboard_config = :dashboardConfig::jsonb WHERE id = :id",
          {
            replacements: {
              dashboardConfig: JSON.stringify(next),
              id: club.id,
            },
          },
      );
    }
  },

  async down() {
    // Irreversible: clubGoals is a supported section; removing it would break clubs.
  },
};
