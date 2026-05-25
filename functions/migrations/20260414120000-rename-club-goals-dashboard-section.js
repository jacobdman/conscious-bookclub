/* eslint-disable new-cap */

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

      if (Array.isArray(config)) {
        const next = config.map((item) => {
          if (!item || !item.id) return item;
          if (item.id === "clubGoalSpotlight") {
            return {...item, id: "clubGoals"};
          }
          return item;
        });
        const hasClubGoals = next.some((item) => item && item.id === "clubGoals");
        if (!hasClubGoals && config.some((item) => item && item.id === "clubGoalSpotlight")) {
          // already mapped above
        }
        await queryInterface.sequelize.query(
            `UPDATE clubs SET dashboard_config = :dashboardConfig::jsonb WHERE id = :id`,
            {
              replacements: {
                dashboardConfig: JSON.stringify(next),
                id: club.id,
              },
            },
        );
        continue;
      }

      if (config.order || config.sections) {
        const order = Array.isArray(config.order) ? config.order : [];
        const sections = config.sections || {};
        const nextOrder = order.map((id) => (id === "clubGoalSpotlight" ? "clubGoals" : id));
        const nextSections = {...sections};
        if (nextSections.clubGoalSpotlight) {
          nextSections.clubGoals = nextSections.clubGoalSpotlight;
          delete nextSections.clubGoalSpotlight;
        }
        await queryInterface.sequelize.query(
            `UPDATE clubs SET dashboard_config = :dashboardConfig::jsonb WHERE id = :id`,
            {
              replacements: {
                dashboardConfig: JSON.stringify({
                  order: nextOrder,
                  sections: nextSections,
                }),
                id: club.id,
              },
            },
        );
      }
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

      if (Array.isArray(config)) {
        const next = config.map((item) => {
          if (!item || !item.id) return item;
          if (item.id === "clubGoals") {
            return {...item, id: "clubGoalSpotlight"};
          }
          return item;
        });
        await queryInterface.sequelize.query(
            `UPDATE clubs SET dashboard_config = :dashboardConfig::jsonb WHERE id = :id`,
            {
              replacements: {
                dashboardConfig: JSON.stringify(next),
                id: club.id,
              },
            },
        );
      }
    }
  },
};
