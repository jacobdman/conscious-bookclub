/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (tableDefinition.suggester_notes) {
      return;
    }

    await queryInterface.addColumn("books", "suggester_notes", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (!tableDefinition.suggester_notes) {
      return;
    }

    await queryInterface.removeColumn("books", "suggester_notes");
  },
};
