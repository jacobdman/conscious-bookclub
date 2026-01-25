/* eslint-disable new-cap */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const table = await queryInterface.describeTable("clubs");

      if (!table.theme_overrides) {
        await queryInterface.addColumn(
            "clubs",
            "theme_overrides",
            {
              type: Sequelize.JSONB,
              allowNull: false,
              defaultValue: Sequelize.literal("'{}'::jsonb"),
            },
            {transaction},
        );
      }

      await queryInterface.sequelize.query(
          `UPDATE clubs
           SET theme_overrides = '{}'::jsonb
           WHERE theme_overrides IS NULL`,
          {transaction},
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn("clubs", "theme_overrides");
    } catch (error) {
      // Column might not exist
    }
  },
};
