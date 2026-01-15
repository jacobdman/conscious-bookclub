/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const Club = sequelize.define(
      "Club",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        config: {
          type: DataTypes.JSONB,
          defaultValue: {},
        },
        dashboardConfig: {
          type: DataTypes.JSONB,
          field: "dashboard_config",
          defaultValue: [],
        },
        inviteCode: {
          type: DataTypes.STRING(10),
          field: "invite_code",
          allowNull: true,
          unique: true,
        },
        themesEnabled: {
          type: DataTypes.BOOLEAN,
          field: "themes_enabled",
          allowNull: false,
          defaultValue: true,
        },
        themes: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: ["Classy", "Creative", "Curious"],
        },
      },
      {
        tableName: "clubs",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  Club.associate = (models) => {
    Club.hasMany(models.Book, {
      foreignKey: "club_id",
      as: "books",
    });
    Club.hasMany(models.Goal, {
      foreignKey: "club_id",
      as: "goals",
    });
    Club.hasMany(models.Meeting, {
      foreignKey: "club_id",
      as: "meetings",
    });
    Club.hasMany(models.Post, {
      foreignKey: "club_id",
      as: "posts",
    });
    Club.belongsToMany(models.User, {
      through: models.ClubMember,
      foreignKey: "club_id",
      otherKey: "user_id",
      as: "members",
    });
  };

  return Club;
};

