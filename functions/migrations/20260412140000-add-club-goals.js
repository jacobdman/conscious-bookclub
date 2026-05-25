/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const addColumnIfNotExists = async (tableName, columnName, columnDefinition) => {
      const tableDescription = await queryInterface.describeTable(tableName);
      if (!tableDescription[columnName]) {
        await queryInterface.addColumn(tableName, columnName, columnDefinition);
      }
    };

    const addIndexIfNotExists = async (tableName, indexName, fields) => {
      try {
        const indexes = await queryInterface.showIndex(tableName);
        const indexExists = indexes.some((idx) => idx.name === indexName);
        if (!indexExists) {
          await queryInterface.addIndex(tableName, fields, {name: indexName});
        }
      } catch (error) {
        if (!error.message.includes("does not exist")) {
          throw error;
        }
      }
    };

    const clubGoalsExists = await queryInterface.tableExists("club_goals");
    if (!clubGoalsExists) {
      await queryInterface.createTable("club_goals", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        club_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {model: "clubs", key: "id"},
          onDelete: "CASCADE",
        },
        created_by: {
          type: Sequelize.STRING(255),
          allowNull: false,
          references: {model: "users", key: "uid"},
        },
        title: {
          type: Sequelize.STRING(500),
          allowNull: false,
        },
        type: {
          type: Sequelize.STRING(50),
          allowNull: false,
        },
        contribution_mode: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "shared_total",
        },
        progress_direction: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "increase",
        },
        aggregation: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "sum",
        },
        display_style: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: "standard",
        },
        measure: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        cadence: {
          type: Sequelize.STRING(50),
          allowNull: true,
        },
        target_count: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        target_quantity: {
          type: Sequelize.DECIMAL,
          allowNull: true,
        },
        unit: {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
        due_at: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        milestone_template: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        archived: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      await addIndexIfNotExists("club_goals", "idx_club_goals_club_id", ["club_id"]);
      await addIndexIfNotExists("club_goals", "idx_club_goals_archived", ["archived"]);
    }

    await addColumnIfNotExists("goals", "club_goal_id", {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {model: "club_goals", key: "id"},
      onDelete: "SET NULL",
    });

    await addColumnIfNotExists("goals", "progress_direction", {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: "increase",
    });

    await addIndexIfNotExists("goals", "idx_goals_club_goal_id", ["club_goal_id"]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("goals", "idx_goals_club_goal_id").catch(() => {});
    await queryInterface.removeColumn("goals", "progress_direction").catch(() => {});
    await queryInterface.removeColumn("goals", "club_goal_id").catch(() => {});

    const clubGoalsExists = await queryInterface.tableExists("club_goals");
    if (clubGoalsExists) {
      await queryInterface.dropTable("club_goals");
    }
  },
};
