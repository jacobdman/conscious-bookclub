/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("club_goals");
    if (!tableDescription.reporting_period) {
      await queryInterface.addColumn("club_goals", "reporting_period", {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("club_goals", "reporting_period").catch(() => {});
  },
};
