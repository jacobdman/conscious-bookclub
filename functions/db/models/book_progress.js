/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const BookProgress = sequelize.define(
      "BookProgress",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        userId: {
          type: DataTypes.STRING,
          field: "user_id",
        },
        bookId: {
          type: DataTypes.INTEGER,
          field: "book_id",
        },
        status: {
          type: DataTypes.STRING(50),
          defaultValue: "not_started",
        },
        percentComplete: {
          type: DataTypes.INTEGER,
          field: "percent_complete",
          defaultValue: 0,
          validate: {
            min: 0,
            max: 100,
          },
        },
        privacy: {
          type: DataTypes.STRING(20),
          defaultValue: "public",
        },
        updatedAt: {
          type: DataTypes.DATE,
          field: "updated_at",
        },
      },
      {
        tableName: "book_progress",
        timestamps: false,
        indexes: [
          {
            unique: true,
            fields: ["user_id", "book_id"],
          },
        ],
      },
  );

  BookProgress.associate = (models) => {
    BookProgress.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
    BookProgress.belongsTo(models.Book, {
      foreignKey: "book_id",
      as: "book",
    });
  };

  return BookProgress;
};

