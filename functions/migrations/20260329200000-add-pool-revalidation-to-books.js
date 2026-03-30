/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("books");

    if (!tableDefinition.pool) {
      await queryInterface.addColumn("books", "pool", {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: "suggested",
      });
    }

    if (!tableDefinition.promoted_at) {
      await queryInterface.addColumn("books", "promoted_at", {
        type: Sequelize.DATEONLY,
        allowNull: true,
      });
    }

    if (!tableDefinition.revalidation_requested_at) {
      await queryInterface.addColumn("books", "revalidation_requested_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE books
      SET pool = 'backlog'
      WHERE chosen_for_bookclub = true
    `);
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (tableDefinition.revalidation_requested_at) {
      await queryInterface.removeColumn("books", "revalidation_requested_at");
    }
    if (tableDefinition.promoted_at) {
      await queryInterface.removeColumn("books", "promoted_at");
    }
    if (tableDefinition.pool) {
      await queryInterface.removeColumn("books", "pool");
    }
  },
};
