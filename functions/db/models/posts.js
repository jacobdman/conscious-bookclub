/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const Post = sequelize.define(
      "Post",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        authorId: {
          type: DataTypes.STRING,
          field: "author_id",
        },
        authorName: {
          type: DataTypes.STRING(255),
          field: "author_name",
          allowNull: false,
        },
        text: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        clubId: {
          type: DataTypes.INTEGER,
          field: "club_id",
          allowNull: false,
        },
        parentPostId: {
          type: DataTypes.INTEGER,
          field: "parent_post_id",
          allowNull: true,
        },
        parentPostText: {
          type: DataTypes.TEXT,
          field: "parent_post_text",
          allowNull: true,
        },
        parentAuthorName: {
          type: DataTypes.STRING(255),
          field: "parent_author_name",
          allowNull: true,
        },
      },
      {
        tableName: "posts",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  Post.associate = (models) => {
    Post.belongsTo(models.User, {
      foreignKey: "author_id",
      as: "author",
    });
    Post.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
    Post.belongsTo(models.Post, {
      foreignKey: "parent_post_id",
      as: "parentPost",
    });
    Post.hasMany(models.PostReaction, {
      foreignKey: "post_id",
      as: "reactions",
    });
  };

  return Post;
};

