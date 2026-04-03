/* eslint-disable new-cap */

/**
 * Drops legacy book_likes after data was migrated to book_interactions.
 * Run only after application code no longer references book_likes.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    const tableExists = await queryInterface.tableExists("book_likes");
    if (!tableExists) {
      return;
    }

    const removeIndexSafe = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (error) {
        // ignore if missing
      }
    };

    await removeIndexSafe("book_likes", "idx_book_likes_book_id");
    await removeIndexSafe("book_likes", "idx_book_likes_user_id");
    await removeIndexSafe("book_likes", "uq_book_likes_book_user");

    await queryInterface.dropTable("book_likes");
  },

  async down(queryInterface, Sequelize) {
    const tableExists = await queryInterface.tableExists("book_likes");
    if (tableExists) {
      return;
    }

    await queryInterface.createTable("book_likes", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: "books", key: "id"},
        onDelete: "CASCADE",
      },
      user_id: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {model: "users", key: "uid"},
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("book_likes", ["book_id"], {
      name: "idx_book_likes_book_id",
    });
    await queryInterface.addIndex("book_likes", ["user_id"], {
      name: "idx_book_likes_user_id",
    });
    await queryInterface.addIndex("book_likes", ["book_id", "user_id"], {
      name: "uq_book_likes_book_user",
      unique: true,
    });
  },
};
