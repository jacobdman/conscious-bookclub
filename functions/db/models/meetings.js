/* eslint-disable new-cap */
module.exports = function(sequelize, DataTypes) {
  const Meeting = sequelize.define(
      "Meeting",
      {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        date: {
          type: DataTypes.DATEONLY,
          allowNull: false,
        },
        location: {
          type: DataTypes.STRING(255),
        },
        bookId: {
          type: DataTypes.INTEGER,
          field: "book_id",
        },
        notes: {
          type: DataTypes.TEXT,
        },
      },
      {
        tableName: "meetings",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: false,
      },
  );

  Meeting.associate = (models) => {
    Meeting.belongsTo(models.Book, {
      foreignKey: "book_id",
      as: "book",
    });
  };

  return Meeting;
};

