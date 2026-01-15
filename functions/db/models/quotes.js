/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const Quote = sequelize.define(
      "Quote",
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
        quote: {
          type: DataTypes.TEXT,
          allowNull: false,
        },
        author: {
          type: DataTypes.STRING(500),
          allowNull: true,
        },
        bookId: {
          type: DataTypes.INTEGER,
          field: "book_id",
          allowNull: true,
        },
        createdBy: {
          type: DataTypes.STRING,
          field: "created_by",
          allowNull: false,
        },
      },
      {
        tableName: "quotes",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
        indexes: [
          {
            fields: ["club_id"],
          },
          {
            fields: ["book_id"],
          },
        ],
      },
  );

  Quote.associate = (models) => {
    Quote.belongsTo(models.Club, {
      foreignKey: "club_id",
      as: "club",
    });
    Quote.belongsTo(models.Book, {
      foreignKey: "book_id",
      as: "book",
    });
    Quote.belongsTo(models.User, {
      foreignKey: "created_by",
      as: "creator",
    });
    Quote.hasMany(models.QuoteLike, {
      foreignKey: "quote_id",
      as: "likes",
    });
  };

  return Quote;
};
