/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const QuoteLike = sequelize.define(
      "QuoteLike",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        quoteId: {
          type: DataTypes.INTEGER,
          field: "quote_id",
          allowNull: false,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
          allowNull: false,
        },
      },
      {
        tableName: "quote_likes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ["quote_id", "user_id"],
          },
        ],
      },
  );

  QuoteLike.associate = (models) => {
    QuoteLike.belongsTo(models.Quote, {
      foreignKey: "quote_id",
      as: "quote",
    });
    QuoteLike.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return QuoteLike;
};
