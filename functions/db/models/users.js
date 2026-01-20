/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const User = sequelize.define(
      "User",
      {
        uid: {
          type: DataTypes.STRING,
          primaryKey: true,
          allowNull: false,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: false,
        },
        displayName: {
          type: DataTypes.STRING,
          field: "display_name",
        },
        photoUrl: {
          type: DataTypes.TEXT,
          field: "photo_url",
        },
        lastLoginAt: {
          type: DataTypes.DATE,
          field: "last_login_at",
        },
        dailyGoalNotificationTime: {
          type: DataTypes.TIME,
          field: "daily_goal_notification_time",
        },
        dailyGoalNotificationsEnabled: {
          type: DataTypes.BOOLEAN,
          field: "daily_goal_notifications_enabled",
          defaultValue: false,
        },
        timezone: {
          type: DataTypes.STRING(100),
        },
        notificationSettings: {
          type: DataTypes.JSONB,
          field: "notification_settings",
        },
        settings: {
          type: DataTypes.JSONB,
          field: "settings",
          defaultValue: {},
        },
      },
      {
        tableName: "users",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  User.associate = (models) => {
    User.hasMany(models.Post, {
      foreignKey: "author_id",
      as: "posts",
    });
    User.hasMany(models.Goal, {
      foreignKey: "user_id",
      as: "goals",
    });
    User.hasMany(models.GoalCompletion, {
      foreignKey: "user_id",
      as: "goalCompletions",
    });
    User.hasMany(models.GoalEntry, {
      foreignKey: "user_id",
      as: "goalEntries",
    });
    User.hasMany(models.BookProgress, {
      foreignKey: "user_id",
      as: "bookProgresses",
    });
    User.belongsToMany(models.Club, {
      through: models.ClubMember,
      foreignKey: "user_id",
      otherKey: "club_id",
      as: "clubs",
    });
    User.hasMany(models.PushSubscription, {
      foreignKey: "user_id",
      as: "pushSubscriptions",
    });
    User.hasMany(models.QuoteLike, {
      foreignKey: "user_id",
      as: "quoteLikes",
    });
  };

  return User;
};

