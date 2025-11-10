/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const PostReaction = sequelize.define(
      "PostReaction",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        postId: {
          type: DataTypes.INTEGER,
          field: "post_id",
          allowNull: false,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
          allowNull: false,
        },
        emoji: {
          type: DataTypes.STRING(50),
          allowNull: false,
        },
      },
      {
        tableName: "post_reactions",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ["post_id", "user_id", "emoji"],
          },
        ],
      },
  );

  PostReaction.associate = (models) => {
    PostReaction.belongsTo(models.Post, {
      foreignKey: "post_id",
      as: "post",
    });
    PostReaction.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return PostReaction;
};

