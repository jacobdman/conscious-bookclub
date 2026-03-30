/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const BookInteraction = sequelize.define(
      "BookInteraction",
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
        action: {
          type: DataTypes.STRING(20),
          allowNull: false,
        },
      },
      {
        tableName: "book_interactions",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
        indexes: [
          {
            unique: true,
            fields: ["book_id", "user_id", "action"],
          },
        ],
      },
  );

  BookInteraction.associate = (models) => {
    BookInteraction.belongsTo(models.Book, {
      foreignKey: "book_id",
      as: "book",
    });
    BookInteraction.belongsTo(models.User, {
      foreignKey: "user_id",
      targetKey: "uid",
      as: "user",
    });
  };

  return BookInteraction;
};
