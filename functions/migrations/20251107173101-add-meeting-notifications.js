/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to safely add column if it doesn't exist
    const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
      const tableDescription = await queryInterface.describeTable(tableName);
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDefinition);
      }
    };

    // Add notification preference columns to meetings table
    await addColumnIfNotExists(
        "meetings",
        "notify_one_day_before",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
    );

    await addColumnIfNotExists(
        "meetings",
        "notify_one_week_before",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove columns from meetings table
    const tableDescription = await queryInterface.describeTable("meetings");
    if (tableDescription["notify_one_day_before"]) {
      await queryInterface.removeColumn("meetings", "notify_one_day_before");
    }
    if (tableDescription["notify_one_week_before"]) {
      await queryInterface.removeColumn("meetings", "notify_one_week_before");
    }
  },
};

