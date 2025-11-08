/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("meetings", "duration", {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 120, // Default to 2 hours (120 minutes)
      comment: "Meeting duration in minutes",
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("meetings", "duration");
  },
};
