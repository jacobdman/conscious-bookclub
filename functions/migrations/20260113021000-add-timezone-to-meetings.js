/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("meetings", "timezone", {
      // eslint-disable-next-line new-cap
      type: Sequelize.STRING(100),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("meetings", "timezone");
  },
};
