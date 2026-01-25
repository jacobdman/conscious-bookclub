module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("posts", "mentioned_user_ids", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn("posts", "mentioned_user_ids");
  },
};
