/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("book_interactions", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: "books", key: "id"},
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {model: "users", key: "uid"},
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      action: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex(
        "book_interactions",
        ["book_id", "user_id", "action"],
        {
          unique: true,
          name: "book_interactions_book_user_action_unique",
        },
    );

    await queryInterface.addIndex("book_interactions", ["book_id"], {
      name: "book_interactions_book_id_idx",
    });
    await queryInterface.addIndex("book_interactions", ["user_id"], {
      name: "book_interactions_user_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("book_interactions");
  },
};
