/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const DEFAULT_DASHBOARD_CONFIG = [
      {id: "habitLeaderboard", enabled: true},
      {id: "nextMeeting", enabled: true},
      {id: "quote", enabled: true},
      {id: "quickGoals", enabled: true},
      {id: "upcomingBooks", enabled: true},
      {id: "feed", enabled: true},
    ];

    try {
      const table = await queryInterface.describeTable("clubs");
      const columnExists = !!table.dashboard_config;

      if (!columnExists) {
        await queryInterface.addColumn(
            "clubs",
            "dashboard_config",
            {
              type: Sequelize.JSONB,
              allowNull: false,
              defaultValue: Sequelize.literal(`'${JSON.stringify(DEFAULT_DASHBOARD_CONFIG)}'::jsonb`),
            },
            {transaction},
        );
      }

      await queryInterface.sequelize.query(
          `UPDATE clubs
           SET dashboard_config = :defaultConfig::jsonb
           WHERE dashboard_config IS NULL`,
          {
            replacements: {defaultConfig: JSON.stringify(DEFAULT_DASHBOARD_CONFIG)},
            transaction,
          },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("clubs", "dashboard_config");
  },
};
