

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

    // Add new columns to goals table (only if they don't exist)
    await addColumnIfNotExists("goals", "measure", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await addColumnIfNotExists("goals", "cadence", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await addColumnIfNotExists("goals", "target_count", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await addColumnIfNotExists("goals", "target_quantity", {
      type: Sequelize.DECIMAL,
      allowNull: true,
    });

    await addColumnIfNotExists("goals", "unit", {
      type: Sequelize.STRING(100),
      allowNull: true,
    });

    await addColumnIfNotExists("goals", "due_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await addColumnIfNotExists("goals", "visibility", {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: "public",
    });

    // Update type column to allow new values
    // Note: This assumes the column already exists and we're just allowing new values
    // PostgreSQL doesn't have a direct way to change enum values, so we'll use VARCHAR
    // If it's currently an enum, this would need to be handled differently

    // Remove old columns if they exist (handle errors gracefully)
    try {
      await queryInterface.removeColumn("goals", "frequency");
    } catch (error) {
      // Column might not exist, that's okay
      if (!error.message.includes("does not exist")) {
        throw error;
      }
    }

    try {
      await queryInterface.removeColumn("goals", "milestones");
    } catch (error) {
      // Column might not exist, that's okay
      if (!error.message.includes("does not exist")) {
        throw error;
      }
    }

    // Create goal_entry table (only if it doesn't exist)
    const goalEntryTableExists = await queryInterface.tableExists("goal_entry");
    if (!goalEntryTableExists) {
      await queryInterface.createTable("goal_entry", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        goal_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "goals",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        user_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
          references: {
            model: "users",
            key: "uid",
          },
          onDelete: "CASCADE",
        },
        occurred_at: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        quantity: {
          type: Sequelize.DECIMAL,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });
    }

    // Create milestone table (only if it doesn't exist)
    const milestoneTableExists = await queryInterface.tableExists("milestone");
    if (!milestoneTableExists) {
      await queryInterface.createTable("milestone", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        goal_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "goals",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        title: {
          type: Sequelize.STRING(500),
          allowNull: false,
        },
        done: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        done_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
      });
    }

    // Add indexes (only if they don't exist)
    const addIndexIfNotExists = async (tableName, indexName, fields) => {
      const indexes = await queryInterface.showIndex(tableName);
      const indexExists = indexes.some((idx) => idx.name === indexName);
      if (!indexExists) {
        await queryInterface.addIndex(tableName, fields, {name: indexName});
      }
    };

    await addIndexIfNotExists("goals", "idx_goals_type", ["type"]);
    await addIndexIfNotExists("goal_entry", "idx_goal_entry_goal_id", ["goal_id"]);
    await addIndexIfNotExists("goal_entry", "idx_goal_entry_user_id", ["user_id"]);
    await addIndexIfNotExists("goal_entry", "idx_goal_entry_occurred_at", ["occurred_at"]);
    await addIndexIfNotExists("milestone", "idx_milestone_goal_id", ["goal_id"]);
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex("milestone", "idx_milestone_goal_id");
    await queryInterface.removeIndex("goal_entry", "idx_goal_entry_occurred_at");
    await queryInterface.removeIndex("goal_entry", "idx_goal_entry_user_id");
    await queryInterface.removeIndex("goal_entry", "idx_goal_entry_goal_id");
    await queryInterface.removeIndex("goals", "idx_goals_type");

    // Drop tables
    await queryInterface.dropTable("milestone");
    await queryInterface.dropTable("goal_entry");

    // Remove new columns
    await queryInterface.removeColumn("goals", "visibility");
    await queryInterface.removeColumn("goals", "due_at");
    await queryInterface.removeColumn("goals", "unit");
    await queryInterface.removeColumn("goals", "target_quantity");
    await queryInterface.removeColumn("goals", "target_count");
    await queryInterface.removeColumn("goals", "cadence");
    await queryInterface.removeColumn("goals", "measure");

    // Restore old columns (if needed)
    await queryInterface.addColumn("goals", "frequency", {
      type: Sequelize.STRING(50),
      allowNull: true,
    });

    await queryInterface.addColumn("goals", "milestones", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
    });
  },
};
