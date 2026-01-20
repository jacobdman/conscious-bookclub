/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const DASHBOARD_SECTION_ORDER = [
      "habitLeaderboard",
      "nextMeeting",
      "quickGoals",
      "quote",
      "upcomingBooks",
      "feed",
    ];

    const DEFAULT_DASHBOARD_CONFIG = DASHBOARD_SECTION_ORDER.map((id) => ({
      id,
      enabled: true,
    }));

    const coerceArrayConfig = (config) => {
      if (Array.isArray(config)) return config;

      if (config && (Array.isArray(config.order) || config.sections)) {
        const order = Array.isArray(config.order) ? config.order : [];
        const sections = config.sections || {};
        const mapped = [];

        order
          .filter((id) => DASHBOARD_SECTION_ORDER.includes(id))
          .forEach((id) => {
            mapped.push({
              id,
              enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
            });
          });

        Object.keys(sections).forEach((id) => {
          if (!DASHBOARD_SECTION_ORDER.includes(id)) return;
          if (mapped.find((item) => item.id === id)) return;
          mapped.push({
            id,
            enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
          });
        });

        return mapped;
      }

      return [];
    };

    const buildDashboardConfig = (config) => {
      const arrayConfig = coerceArrayConfig(config);
      return DASHBOARD_SECTION_ORDER.map((id) => {
        const match = arrayConfig.find((item) => item && item.id === id);
        return {
          id,
          enabled: typeof match?.enabled === "boolean" ? match.enabled : true,
        };
      });
    };

    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE clubs
         ALTER COLUMN dashboard_config
         SET DEFAULT '${JSON.stringify(DEFAULT_DASHBOARD_CONFIG)}'::jsonb`,
        { transaction },
      );

      const clubs = await queryInterface.sequelize.query(
        "SELECT id, dashboard_config FROM clubs",
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );

      for (const club of clubs) {
        const nextConfig = buildDashboardConfig(club.dashboard_config);
        await queryInterface.sequelize.query(
          `UPDATE clubs
           SET dashboard_config = :dashboardConfig::jsonb
           WHERE id = :id`,
          {
            replacements: {
              dashboardConfig: JSON.stringify(nextConfig),
              id: club.id,
            },
            transaction,
          },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const DASHBOARD_SECTION_ORDER = [
      "habitLeaderboard",
      "nextMeeting",
      "quote",
      "quickGoals",
      "upcomingBooks",
      "feed",
    ];

    const DEFAULT_DASHBOARD_CONFIG = DASHBOARD_SECTION_ORDER.map((id) => ({
      id,
      enabled: true,
    }));

    const coerceArrayConfig = (config) => {
      if (Array.isArray(config)) return config;

      if (config && (Array.isArray(config.order) || config.sections)) {
        const order = Array.isArray(config.order) ? config.order : [];
        const sections = config.sections || {};
        const mapped = [];

        order
          .filter((id) => DASHBOARD_SECTION_ORDER.includes(id))
          .forEach((id) => {
            mapped.push({
              id,
              enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
            });
          });

        Object.keys(sections).forEach((id) => {
          if (!DASHBOARD_SECTION_ORDER.includes(id)) return;
          if (mapped.find((item) => item.id === id)) return;
          mapped.push({
            id,
            enabled: typeof sections[id]?.enabled === "boolean" ? sections[id].enabled : true,
          });
        });

        return mapped;
      }

      return [];
    };

    const buildDashboardConfig = (config) => {
      const arrayConfig = coerceArrayConfig(config);
      return DASHBOARD_SECTION_ORDER.map((id) => {
        const match = arrayConfig.find((item) => item && item.id === id);
        return {
          id,
          enabled: typeof match?.enabled === "boolean" ? match.enabled : true,
        };
      });
    };

    try {
      await queryInterface.sequelize.query(
        `ALTER TABLE clubs
         ALTER COLUMN dashboard_config
         SET DEFAULT '${JSON.stringify(DEFAULT_DASHBOARD_CONFIG)}'::jsonb`,
        { transaction },
      );

      const clubs = await queryInterface.sequelize.query(
        "SELECT id, dashboard_config FROM clubs",
        { type: Sequelize.QueryTypes.SELECT, transaction },
      );

      for (const club of clubs) {
        const nextConfig = buildDashboardConfig(club.dashboard_config);
        await queryInterface.sequelize.query(
          `UPDATE clubs
           SET dashboard_config = :dashboardConfig::jsonb
           WHERE id = :id`,
          {
            replacements: {
              dashboardConfig: JSON.stringify(nextConfig),
              id: club.id,
            },
            transaction,
          },
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
