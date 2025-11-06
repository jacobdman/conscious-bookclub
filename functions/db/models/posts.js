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
        reactionCounts: {
          type: DataTypes.JSONB,
          field: "reaction_counts",
          defaultValue: {thumbsUp: 0, thumbsDown: 0, heart: 0, laugh: 0},
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
  };

  return Post;
};

