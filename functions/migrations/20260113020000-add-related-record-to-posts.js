/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("posts", "related_record_type", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await queryInterface.addColumn("posts", "related_record_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex("posts", ["related_record_type", "related_record_id"], {
      name: "idx_posts_related_record",
    });
  },

  async down(queryInterface) {
    const removeIndexSafe = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (error) {
        // ignore missing index
      }
    };

    await removeIndexSafe("posts", "idx_posts_related_record");
    await queryInterface.removeColumn("posts", "related_record_id");
    await queryInterface.removeColumn("posts", "related_record_type");
  },
};
