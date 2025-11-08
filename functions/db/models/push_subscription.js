/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const PushSubscription = sequelize.define(
      "PushSubscription",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
          allowNull: false,
        },
        subscriptionJson: {
          type: DataTypes.JSONB,
          field: "subscription_json",
          allowNull: false,
        },
      },
      {
        tableName: "push_subscriptions",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  PushSubscription.associate = (models) => {
    PushSubscription.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return PushSubscription;
};

