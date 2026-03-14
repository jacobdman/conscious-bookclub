/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const NativePushToken = sequelize.define(
      "NativePushToken",
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
        token: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        platform: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
      },
      {
        tableName: "native_push_tokens",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
      },
  );

  NativePushToken.associate = (models) => {
    NativePushToken.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return NativePushToken;
};
