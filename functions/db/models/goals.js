/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const Goal = sequelize.define(
      "Goal",
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
        title: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        measure: {
          type: DataTypes.STRING(50),
        },
        cadence: {
          type: DataTypes.STRING(50),
        },
        targetCount: {
          type: DataTypes.INTEGER,
          field: "target_count",
        },
        targetQuantity: {
          type: DataTypes.DECIMAL,
          field: "target_quantity",
        },
        unit: {
          type: DataTypes.STRING(100),
        },
        dueAt: {
          type: DataTypes.DATE,
          field: "due_at",
        },
        visibility: {
          type: DataTypes.STRING(50),
          defaultValue: "public",
        },
        archived: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        completed: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        completedAt: {
          type: DataTypes.DATE,
          field: "completed_at",
        },
        clubId: {
          type: DataTypes.INTEGER,
          field: "club_id",
          allowNull: false,
        },
        clubGoalId: {
          type: DataTypes.INTEGER,
          field: "club_goal_id",
          allowNull: true,
        },
        progressDirection: {
          type: DataTypes.STRING(50),
          field: "progress_direction",
          allowNull: true,
          defaultValue: "increase",
        },
        goalScope: {
          type: DataTypes.VIRTUAL,
          get() {
            return this.getDataValue("clubGoalId") ? "club" : "personal";
          },
        },
      },
      {
        tableName: "goals",
        paranoid: true,
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        deletedAt: "deleted_at",
      },
  );

  Goal.associate = (models) => {
    Goal.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    Goal.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
    Goal.belongsTo(models.ClubGoal, {
      foreignKey: "club_goal_id",
      as: "clubGoal",
    });
    Goal.hasMany(models.GoalCompletion, {
      foreignKey: "goal_id",
      as: "goalCompletions",
    });
    Goal.hasMany(models.GoalEntry, {
      foreignKey: "goal_id",
      as: "goalEntries",
    });
    Goal.hasMany(models.Milestone, {
      foreignKey: "goal_id",
      as: "milestones",
    });
    Goal.hasMany(models.GoalPause, {
      foreignKey: "goal_id",
      as: "goalPauses",
    });
  };

  return Goal;
};

