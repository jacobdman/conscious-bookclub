/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("books");

    if (!tableDefinition.description) {
      await queryInterface.addColumn("books", "description", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }

    if (!tableDefinition.genre) {
      await queryInterface.addColumn("books", "genre", {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    }

    if (!tableDefinition.fiction) {
      await queryInterface.addColumn("books", "fiction", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (tableDefinition.fiction) {
      await queryInterface.removeColumn("books", "fiction");
    }
    if (tableDefinition.genre) {
      await queryInterface.removeColumn("books", "genre");
    }
    if (tableDefinition.description) {
      await queryInterface.removeColumn("books", "description");
    }
  },
};
