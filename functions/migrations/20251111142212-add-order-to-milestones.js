/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper function to safely add column if it doesn't exist
    const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
      const tableDescription = await queryInterface.describeTable(tableName);
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDefinition);
      }
    };

    // Add order column to milestone table
    await addColumnIfNotExists("milestone", "order", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    // Set default order values for existing milestones based on their ID
    // This ensures existing milestones have an order value
    // Group by goal_id and assign sequential order (0, 1, 2, ...) based on id
    const [results] = await queryInterface.sequelize.query(
        `SELECT id, goal_id FROM milestone ORDER BY goal_id, id`,
    );

    // Group milestones by goal_id
    const milestonesByGoal = {};
    for (const milestone of results) {
      if (!milestonesByGoal[milestone.goal_id]) {
        milestonesByGoal[milestone.goal_id] = [];
      }
      milestonesByGoal[milestone.goal_id].push(milestone.id);
    }

    // Set order for each milestone based on its position within its goal
    for (const milestoneIds of Object.values(milestonesByGoal)) {
      for (const [i, milestoneId] of milestoneIds.entries()) {
        await queryInterface.sequelize.query(
            `UPDATE milestone SET "order" = ${i} WHERE id = ${milestoneId}`,
        );
      }
    }

    // Make order NOT NULL after setting default values
    await queryInterface.changeColumn("milestone", "order", {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // Add index on (goal_id, order) for efficient sorting
    const addIndexIfNotExists = async (tableName, indexName, fields) => {
      const indexes = await queryInterface.showIndex(tableName);
      const indexExists = indexes.some((idx) => idx.name === indexName);
      if (!indexExists) {
        await queryInterface.addIndex(tableName, fields, {name: indexName});
      }
    };

    await addIndexIfNotExists("milestone", "idx_milestone_goal_id_order", ["goal_id", "order"]);
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    try {
      await queryInterface.removeIndex("milestone", "idx_milestone_goal_id_order");
    } catch (error) {
      // Index might not exist, that's okay
    }

    // Remove order column
    try {
      await queryInterface.removeColumn("milestone", "order");
    } catch (error) {
      // Column might not exist, that's okay
    }
  },
};

