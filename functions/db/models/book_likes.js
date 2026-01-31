/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const BookLike = sequelize.define(
      "BookLike",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        bookId: {
          type: DataTypes.INTEGER,
          field: "book_id",
          allowNull: false,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
          allowNull: false,
        },
      },
      {
        tableName: "book_likes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
          {
            unique: true,
            fields: ["book_id", "user_id"],
          },
        ],
      },
  );

  BookLike.associate = (models) => {
    BookLike.belongsTo(models.Book, {
      foreignKey: "book_id",
      as: "book",
    });
    BookLike.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return BookLike;
};
