/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const ClubGoal = sequelize.define(
      "ClubGoal",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        clubId: {
          type: DataTypes.INTEGER,
          field: "club_id",
          allowNull: false,
        },
        createdBy: {
          type: DataTypes.STRING,
          field: "created_by",
          allowNull: false,
        },
        title: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        type: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
        contributionMode: {
          type: DataTypes.STRING(50),
          field: "contribution_mode",
          allowNull: false,
          defaultValue: "shared_total",
        },
        progressDirection: {
          type: DataTypes.STRING(50),
          field: "progress_direction",
          allowNull: false,
          defaultValue: "increase",
        },
        aggregation: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: "sum",
        },
        displayStyle: {
          type: DataTypes.STRING(50),
          field: "display_style",
          allowNull: false,
          defaultValue: "standard",
        },
        measure: {
          type: DataTypes.STRING(50),
        },
        cadence: {
          type: DataTypes.STRING(50),
        },
        reportingPeriod: {
          type: DataTypes.STRING(50),
          field: "reporting_period",
          allowNull: true,
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
        milestoneTemplate: {
          type: DataTypes.JSONB,
          field: "milestone_template",
        },
        archived: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
      },
      {
        tableName: "club_goals",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  ClubGoal.associate = (models) => {
    ClubGoal.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
    ClubGoal.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
    ClubGoal.hasMany(models.Goal, {
      foreignKey: "club_goal_id",
      as: "memberGoals",
    });
  };

  return ClubGoal;
};
