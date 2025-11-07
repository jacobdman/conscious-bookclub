/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const ClubMember = sequelize.define(
      "ClubMember",
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
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
          allowNull: false,
        },
        role: {
          type: DataTypes.STRING(50),
          defaultValue: "member",
        },
      },
      {
        tableName: "club_members",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ["club_id", "user_id"],
          },
        ],
      },
  );

  ClubMember.associate = (models) => {
    ClubMember.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
    ClubMember.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return ClubMember;
};

