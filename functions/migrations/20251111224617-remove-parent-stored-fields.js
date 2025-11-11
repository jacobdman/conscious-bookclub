/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove parent_post_text and parent_author_name columns
    // parent_post_id is kept as it's needed for the foreign key relationship
    await queryInterface.removeColumn("posts", "parent_author_name");
    await queryInterface.removeColumn("posts", "parent_post_text");
  },

  async down(queryInterface, Sequelize) {
    // Restore parent_post_text and parent_author_name columns
    await queryInterface.addColumn("posts", "parent_post_text", {
      type: Sequelize.TEXT,
      allowNull: true,
    });

    await queryInterface.addColumn("posts", "parent_author_name", {
      // eslint-disable-next-line new-cap
      type: Sequelize.STRING(255),
      allowNull: true,
    });
  },
};
