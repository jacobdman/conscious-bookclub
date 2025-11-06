/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const GoalCompletion = sequelize.define(
      "GoalCompletion",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
        },
        goalId: {
          type: DataTypes.INTEGER,
          field: "goal_id",
        },
        periodId: {
          type: DataTypes.STRING(100),
          field: "period_id",
          allowNull: false,
        },
        completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: true,
        },
        completedAt: {
          type: DataTypes.DATE,
          field: "completed_at",
        },
      },
      {
        tableName: "goal_completions",
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ["user_id", "goal_id", "period_id"],
          },
        ],
      },
  );

  GoalCompletion.associate = (models) => {
    GoalCompletion.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    GoalCompletion.belongsTo(models.Goal, {
      foreignKey: "goal_id",
      as: "goal",
    });
  };

  return GoalCompletion;
};

