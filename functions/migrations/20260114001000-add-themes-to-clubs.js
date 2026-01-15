/* eslint-disable new-cap */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    const DEFAULT_THEMES = ["Classy", "Creative", "Curious"];
    const defaultThemesLiteral = Sequelize.literal(
        `'${JSON.stringify(DEFAULT_THEMES)}'::jsonb`,
    );

    try {
      const table = await queryInterface.describeTable("clubs");

      if (!table.themes_enabled) {
        await queryInterface.addColumn(
            "clubs",
            "themes_enabled",
            {
              type: Sequelize.BOOLEAN,
              allowNull: false,
              defaultValue: true,
            },
            {transaction},
        );
      }

      if (!table.themes) {
        await queryInterface.addColumn(
            "clubs",
            "themes",
            {
              type: Sequelize.JSONB,
              allowNull: false,
              defaultValue: defaultThemesLiteral,
            },
            {transaction},
        );
      }

      await queryInterface.sequelize.query(
          `UPDATE clubs
           SET themes_enabled = true
           WHERE themes_enabled IS NULL`,
          {transaction},
      );

      await queryInterface.sequelize.query(
          `UPDATE clubs
           SET themes = :defaultThemes::jsonb
           WHERE themes IS NULL`,
          {
            replacements: {defaultThemes: JSON.stringify(DEFAULT_THEMES)},
            transaction,
          },
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn("clubs", "themes_enabled");
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn("clubs", "themes");
    } catch (error) {
      // Column might not exist
    }
  },
};
