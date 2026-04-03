/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const Book = sequelize.define(
      "Book",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        externalApiId: {
          type: DataTypes.STRING,
          field: "external_api_id",
          unique: true,
        },
        title: {
          type: DataTypes.STRING(500),
          allowNull: false,
        },
        author: {
          type: DataTypes.STRING(500),
        },
        coverImage: {
          type: DataTypes.TEXT,
          field: "cover_image",
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        genre: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        fiction: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        theme: {
          type: DataTypes.JSONB,
          defaultValue: [],
        },
        status: {
          type: DataTypes.STRING(50),
          defaultValue: "active",
        },
        discussionDate: {
          type: DataTypes.DATEONLY,
          field: "discussion_date",
        },
        chosenForBookclub: {
          type: DataTypes.BOOLEAN,
          field: "chosen_for_bookclub",
          allowNull: false,
          defaultValue: false,
        },
        uploadedBy: {
          type: DataTypes.STRING,
          field: "uploaded_by",
          allowNull: false,
        },
        suggesterNotes: {
          type: DataTypes.TEXT,
          field: "suggester_notes",
          allowNull: true,
        },
        clubId: {
          type: DataTypes.INTEGER,
          field: "club_id",
          allowNull: false,
        },
        pool: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: "suggested",
        },
        promotedAt: {
          type: DataTypes.DATEONLY,
          field: "promoted_at",
          allowNull: true,
        },
        revalidationRequestedAt: {
          type: DataTypes.DATE,
          field: "revalidation_requested_at",
          allowNull: true,
        },
      },
      {
        tableName: "books",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  Book.associate = (models) => {
    Book.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
    Book.hasMany(models.Meeting, {
      foreignKey: "book_id",
      as: "meetings",
    });
    Book.hasMany(models.BookProgress, {
      foreignKey: "book_id",
      as: "bookProgresses",
    });
    Book.hasMany(models.BookInteraction, {
      foreignKey: "book_id",
      as: "bookInteractions",
    });
    Book.belongsTo(models.User, {
      foreignKey: "uploaded_by",
      targetKey: "uid",
      as: "uploader",
    });
  };

  return Book;
};

