/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
      const tableDescription = await queryInterface.describeTable(tableName);
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDefinition);
      }
    };

    await addColumnIfNotExists(
        "users",
        "settings",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
    );

    await queryInterface.sequelize.query(`
      UPDATE users
      SET settings = '{}'::jsonb
      WHERE settings IS NULL
    `);
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable("users");
    if (tableDescription["settings"]) {
      await queryInterface.removeColumn("users", "settings");
    }
  },
};
