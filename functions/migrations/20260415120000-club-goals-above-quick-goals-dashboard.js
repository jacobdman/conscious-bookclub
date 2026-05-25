/* eslint-disable new-cap */

/**
 * Default dashboard order: clubGoals above quickGoals.
 * @param {Array<{id: string}>} config Dashboard config array.
 * @return {Array<{id: string}>}
 */
const placeClubGoalsAboveQuickGoals = (config) => {
  if (!Array.isArray(config)) {
    return config;
  }

  const quickIdx = config.findIndex((item) => item && item.id === "quickGoals");
  const clubIdx = config.findIndex((item) => item && item.id === "clubGoals");

  if (quickIdx === -1 || clubIdx === -1 || clubIdx < quickIdx) {
    return config;
  }

  const next = [...config];
  const [clubItem] = next.splice(clubIdx, 1);
  const insertAt = next.findIndex((item) => item && item.id === "quickGoals");
  if (insertAt === -1) {
    return config;
  }
  next.splice(insertAt, 0, clubItem);
  return next;
};

/**
 * @param {object} config Legacy { order, sections } shape.
 * @return {object}
 */
const placeClubGoalsAboveQuickGoalsLegacy = (config) => {
  if (!config || !Array.isArray(config.order)) {
    return config;
  }

  const order = [...config.order];
  const quickIdx = order.indexOf("quickGoals");
  const clubIdx = order.indexOf("clubGoals");

  if (quickIdx === -1 || clubIdx === -1 || clubIdx < quickIdx) {
    return config;
  }

  order.splice(clubIdx, 1);
  order.splice(quickIdx, 0, "clubGoals");

  return {...config, order};
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

      if (Array.isArray(config)) {
        next = placeClubGoalsAboveQuickGoals(config);
      } else if (config.order || config.sections) {
        next = placeClubGoalsAboveQuickGoalsLegacy(config);
      }

      if (next === config) continue;

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

  async down(queryInterface, Sequelize) {
    const clubs = await queryInterface.sequelize.query(
        "SELECT id, dashboard_config FROM clubs WHERE dashboard_config IS NOT NULL",
        {type: Sequelize.QueryTypes.SELECT},
    );

    for (const club of clubs) {
      const config = club.dashboard_config;
      if (!config) continue;

      let next = config;

      if (Array.isArray(config)) {
        const quickIdx = config.findIndex((item) => item && item.id === "quickGoals");
        const clubIdx = config.findIndex((item) => item && item.id === "clubGoals");
        if (quickIdx !== -1 && clubIdx !== -1 && clubIdx < quickIdx && quickIdx - clubIdx === 1) {
          const arr = [...config];
          const [clubItem] = arr.splice(clubIdx, 1);
          arr.splice(quickIdx, 0, clubItem);
          next = arr;
        }
      } else if (config.order || config.sections) {
        const order = Array.isArray(config.order) ? [...config.order] : [];
        const quickIdx = order.indexOf("quickGoals");
        const clubIdx = order.indexOf("clubGoals");
        if (quickIdx !== -1 && clubIdx !== -1 && clubIdx < quickIdx && quickIdx - clubIdx === 1) {
          order.splice(clubIdx, 1);
          order.splice(quickIdx, 0, "clubGoals");
          next = {...config, order};
        }
      }

      if (next === config) continue;

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
};
