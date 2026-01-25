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
        isSpoiler: {
          type: DataTypes.BOOLEAN,
          field: "is_spoiler",
          allowNull: false,
          defaultValue: false,
        },
        isActivity: {
          type: DataTypes.BOOLEAN,
          field: "is_activity",
          allowNull: false,
          defaultValue: false,
        },
        images: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: [],
        },
        relatedRecordType: {
          type: DataTypes.STRING(100),
          field: "related_record_type",
          allowNull: true,
        },
        relatedRecordId: {
          type: DataTypes.INTEGER,
          field: "related_record_id",
          allowNull: true,
        },
        mentionedUserIds: {
          type: DataTypes.JSONB,
          field: "mentioned_user_ids",
          allowNull: true,
          defaultValue: null,
        },
      },
      {
        tableName: "posts",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  // Virtual field to get parent post's isSpoiler status
  Post.prototype.getParentIsSpoiler = function() {
    return this.parentPost ? (this.parentPost.isSpoiler || false) : null;
  };

  // Add virtual field to JSON output
  Post.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    if (this.parentPost) {
      values.parentIsSpoiler = this.parentPost.isSpoiler || false;
    } else if (this.parentPostId) {
      // If parentPostId exists but parentPost is not loaded, return null
      values.parentIsSpoiler = null;
    }
    return values;
  };

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

