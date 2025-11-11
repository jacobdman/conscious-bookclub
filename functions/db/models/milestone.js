/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const Milestone = sequelize.define(
      "Milestone",
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
        title: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        done: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        doneAt: {
          type: DataTypes.DATE,
          field: "done_at",
        },
        order: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
      },
      {
        tableName: "milestone",
        timestamps: false,
      },
  );

  Milestone.associate = (models) => {
    Milestone.belongsTo(models.Goal, {
      foreignKey: "goal_id",
      as: "goal",
    });
  };

  return Milestone;
};

