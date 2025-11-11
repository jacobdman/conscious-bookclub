/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove notification preference columns from meetings table
    const tableDescription = await queryInterface.describeTable("meetings");
    if (tableDescription["notify_one_day_before"]) {
      await queryInterface.removeColumn("meetings", "notify_one_day_before");
    }
    if (tableDescription["notify_one_week_before"]) {
      await queryInterface.removeColumn("meetings", "notify_one_week_before");
    }
  },

  async down(queryInterface, Sequelize) {
    // Re-add columns if rolling back
    const tableDescription = await queryInterface.describeTable("meetings");
    if (!tableDescription["notify_one_day_before"]) {
      await queryInterface.addColumn(
          "meetings",
          "notify_one_day_before",
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
      );
    }
    if (!tableDescription["notify_one_week_before"]) {
      await queryInterface.addColumn(
          "meetings",
          "notify_one_week_before",
          {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
      );
    }
  },
};

