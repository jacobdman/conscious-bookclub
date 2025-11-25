/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const PendingClubRequest = sequelize.define(
      "PendingClubRequest",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        clubId: {
          type: DataTypes.INTEGER,
          field: "club_id",
          allowNull: true,
        },
        message: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
      },
      {
        tableName: "pending_club_requests",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  PendingClubRequest.associate = (models) => {
    PendingClubRequest.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
  };

  return PendingClubRequest;
};

