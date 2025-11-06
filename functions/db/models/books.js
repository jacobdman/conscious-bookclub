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
        googleBooksId: {
          type: DataTypes.STRING,
          field: "google_books_id",
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
      },
      {
        tableName: "books",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  Book.associate = (models) => {
    Book.hasMany(models.Meeting, {
      foreignKey: "book_id",
      as: "meetings",
    });
    Book.hasMany(models.BookProgress, {
      foreignKey: "book_id",
      as: "bookProgresses",
    });
  };

  return Book;
};

