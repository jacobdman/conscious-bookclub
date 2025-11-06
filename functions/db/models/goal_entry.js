/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const GoalEntry = sequelize.define(
      "GoalEntry",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        goalId: {
          type: DataTypes.INTEGER,
          field: "goal_id",
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
        },
        occurredAt: {
          type: DataTypes.DATE,
          field: "occurred_at",
          allowNull: false,
        },
        quantity: {
          type: DataTypes.DECIMAL,
        },
      },
      {
        tableName: "goal_entry",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  GoalEntry.associate = (models) => {
    GoalEntry.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    GoalEntry.belongsTo(models.Goal, {
      foreignKey: "goal_id",
      as: "goal",
    });
  };

  return GoalEntry;
};

