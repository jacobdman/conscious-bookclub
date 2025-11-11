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

    // Add notification_settings JSON column to users table
    await addColumnIfNotExists(
        "users",
        "notification_settings",
        {
          type: Sequelize.JSONB,
          allowNull: true,
        },
    );

    // Migrate existing data: set default notification_settings based on
    // existing goal notification preferences
    const [results] = await queryInterface.sequelize.query(`
      SELECT uid, daily_goal_notifications_enabled, daily_goal_notification_time
      FROM users
      WHERE notification_settings IS NULL
    `);

    for (const user of results) {
      const defaultSettings = {
        goals: {
          enabled: user.daily_goal_notifications_enabled || false,
          time: user.daily_goal_notification_time || "09:00:00",
        },
        feed: {
          enabled: false,
          mode: "all",
        },
        meetings: {
          enabled: false,
          oneWeekBefore: false,
          oneDayBefore: false,
        },
      };

      await queryInterface.sequelize.query(`
        UPDATE users
        SET notification_settings = :settings::jsonb
        WHERE uid = :uid
      `, {
        replacements: {
          settings: JSON.stringify(defaultSettings),
          uid: user.uid,
        },
      });
    }

    // Set default for any remaining NULL values
    const defaultSettingsJson = JSON.stringify({
      goals: {
        enabled: false,
        time: "09:00:00",
      },
      feed: {
        enabled: false,
        mode: "all",
      },
      meetings: {
        enabled: false,
        oneWeekBefore: false,
        oneDayBefore: false,
      },
    });

    await queryInterface.sequelize.query(`
      UPDATE users
      SET notification_settings = :settings::jsonb
      WHERE notification_settings IS NULL
    `, {
      replacements: {
        settings: defaultSettingsJson,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove notification_settings column from users table
    const tableDescription = await queryInterface.describeTable("users");
    if (tableDescription["notification_settings"]) {
      await queryInterface.removeColumn("users", "notification_settings");
    }
  },
};

