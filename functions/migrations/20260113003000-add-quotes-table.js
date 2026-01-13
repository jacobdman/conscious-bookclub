/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.tableExists("quotes");
    if (tableExists) {
      return;
    }

    await queryInterface.createTable("quotes", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      club_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "clubs",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      quote: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      author: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      book_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: "books",
          key: "id",
        },
        onDelete: "SET NULL",
      },
      created_by: {
        type: Sequelize.STRING,
        allowNull: false,
        references: {
          model: "users",
          key: "uid",
        },
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    await queryInterface.addIndex("quotes", ["club_id"], {
      name: "idx_quotes_club_id",
    });
    await queryInterface.addIndex("quotes", ["book_id"], {
      name: "idx_quotes_book_id",
    });
    await queryInterface.addIndex("quotes", ["created_by"], {
      name: "idx_quotes_created_by",
    });
  },

  async down(queryInterface, Sequelize) {
    const removeIndexSafe = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (error) {
        // ignore if missing
      }
    };

    await removeIndexSafe("quotes", "idx_quotes_club_id");
    await removeIndexSafe("quotes", "idx_quotes_book_id");
    await removeIndexSafe("quotes", "idx_quotes_created_by");

    await queryInterface.dropTable("quotes");
  },
};
