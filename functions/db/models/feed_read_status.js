/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const FeedReadStatus = sequelize.define(
      "FeedReadStatus",
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
        clubId: {
          type: DataTypes.INTEGER,
          field: "club_id",
          allowNull: false,
        },
        lastReadAt: {
          type: DataTypes.DATE,
          field: "last_read_at",
          allowNull: false,
          defaultValue: DataTypes.NOW,
        },
      },
      {
        tableName: "feed_read_status",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ["user_id", "club_id"],
          },
        ],
      },
  );

  FeedReadStatus.associate = (models) => {
    FeedReadStatus.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    FeedReadStatus.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
  };

  return FeedReadStatus;
};

