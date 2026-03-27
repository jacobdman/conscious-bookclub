/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await queryInterface.tableExists("goal_pauses");
    if (exists) return;

    await queryInterface.createTable("goal_pauses", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      goal_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: "goals", key: "id"},
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        references: {model: "users", key: "uid"},
        onDelete: "CASCADE",
      },
      paused_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      resumed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });

    await queryInterface.addIndex("goal_pauses", ["goal_id"], {
      name: "idx_goal_pauses_goal_id",
    });
    await queryInterface.addIndex("goal_pauses", ["user_id"], {
      name: "idx_goal_pauses_user_id",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("goal_pauses");
  },
};
