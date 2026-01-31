/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (tableDefinition.uploaded_by) {
      return;
    }

    await queryInterface.addColumn("books", "uploaded_by", {
      type: Sequelize.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(
        "UPDATE books SET uploaded_by = :userId WHERE uploaded_by IS NULL",
        {replacements: {userId: "w4b6G2JmgFTN7UHXYlgWUPLn0yy2"}},
    );

    await queryInterface.changeColumn("books", "uploaded_by", {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },

  async down(queryInterface, Sequelize) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (!tableDefinition.uploaded_by) {
      return;
    }

    await queryInterface.removeColumn("books", "uploaded_by");
  },
};
