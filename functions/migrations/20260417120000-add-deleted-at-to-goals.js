/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable("goals");
    if (!tableDescription.deleted_at) {
      await queryInterface.addColumn("goals", "deleted_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(
        `UPDATE goals
         SET deleted_at = COALESCE(deleted_at, CURRENT_TIMESTAMP)
         WHERE archived = true AND deleted_at IS NULL`,
    );

    const addIndexIfNotExists = async (indexName) => {
      try {
        const indexes = await queryInterface.showIndex("goals");
        if (!indexes.some((idx) => idx.name === indexName)) {
          await queryInterface.addIndex("goals", ["deleted_at"], {name: indexName});
        }
      } catch (error) {
        if (!error.message.includes("does not exist")) {
          throw error;
        }
      }
    };

    await addIndexIfNotExists("idx_goals_deleted_at");
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeIndex("goals", "idx_goals_deleted_at");
    } catch (error) {
      if (!error.message.includes("does not exist")) {
        throw error;
      }
    }
    try {
      await queryInterface.removeColumn("goals", "deleted_at");
    } catch (error) {
      if (!error.message.includes("does not exist")) {
        throw error;
      }
    }
  },
};
