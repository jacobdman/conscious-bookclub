/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const GoalPause = sequelize.define(
      "GoalPause",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        goalId: {
          type: DataTypes.INTEGER,
          field: "goal_id",
          allowNull: false,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
          allowNull: false,
        },
        pausedAt: {
          type: DataTypes.DATE,
          field: "paused_at",
          allowNull: false,
        },
        resumedAt: {
          type: DataTypes.DATE,
          field: "resumed_at",
          allowNull: true,
        },
      },
      {
        tableName: "goal_pauses",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  GoalPause.associate = (models) => {
    GoalPause.belongsTo(models.Goal, {
      foreignKey: "goal_id",
      as: "goal",
    });
    GoalPause.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return GoalPause;
};
