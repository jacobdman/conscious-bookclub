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

    // Create push_subscriptions table
    const pushSubscriptionsTableExists = await queryInterface.tableExists("push_subscriptions");
    if (!pushSubscriptionsTableExists) {
      await queryInterface.createTable("push_subscriptions", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
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
        subscription_json: {
          type: Sequelize.JSONB,
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
      });

      // Add index on user_id for faster lookups
      await queryInterface.addIndex("push_subscriptions", ["user_id"], {
        name: "idx_push_subscriptions_user_id",
      });
    }

    // Add notification preference columns to users table
    await addColumnIfNotExists(
        "users",
        "daily_goal_notification_time",
        {
          type: Sequelize.TIME,
          allowNull: true,
          defaultValue: "09:00:00",
        },
    );

    await addColumnIfNotExists(
        "users",
        "daily_goal_notifications_enabled",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
    );

    await addColumnIfNotExists(
        "users",
        "timezone",
        {
          type: Sequelize.STRING(100),
          allowNull: true,
        },
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove columns from users table
    const tableDescription = await queryInterface.describeTable("users");
    if (tableDescription["daily_goal_notification_time"]) {
      await queryInterface.removeColumn("users", "daily_goal_notification_time");
    }
    if (tableDescription["daily_goal_notifications_enabled"]) {
      await queryInterface.removeColumn("users", "daily_goal_notifications_enabled");
    }
    if (tableDescription["timezone"]) {
      await queryInterface.removeColumn("users", "timezone");
    }

    // Drop push_subscriptions table
    const pushSubscriptionsTableExists = await queryInterface.tableExists("push_subscriptions");
    if (pushSubscriptionsTableExists) {
      await queryInterface.dropTable("push_subscriptions");
    }
  },
};

