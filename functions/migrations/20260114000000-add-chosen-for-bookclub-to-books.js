/* eslint-disable new-cap */
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("books");
    if (!tableDescription.chosen_for_bookclub) {
      await queryInterface.addColumn("books", "chosen_for_bookclub", {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    await queryInterface.sequelize.query(
        `UPDATE books
         SET chosen_for_bookclub = true
         WHERE id IN (
           SELECT DISTINCT book_id
           FROM meetings
           WHERE book_id IS NOT NULL
         )`,
    );
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeColumn("books", "chosen_for_bookclub");
    } catch (error) {
      // Column might not exist, that's ok
    }
  },
};
