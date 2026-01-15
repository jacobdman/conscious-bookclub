/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.tableExists("quote_likes");
    if (tableExists) {
      return;
    }

    await queryInterface.createTable("quote_likes", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      quote_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "quotes",
          key: "id",
        },
        onDelete: "CASCADE",
      },
      user_id: {
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

    await queryInterface.addIndex("quote_likes", ["quote_id"], {
      name: "idx_quote_likes_quote_id",
    });
    await queryInterface.addIndex("quote_likes", ["user_id"], {
      name: "idx_quote_likes_user_id",
    });
    await queryInterface.addIndex("quote_likes", ["quote_id", "user_id"], {
      name: "uq_quote_likes_quote_user",
      unique: true,
    });
  },

  async down(queryInterface) {
    const removeIndexSafe = async (table, name) => {
      try {
        await queryInterface.removeIndex(table, name);
      } catch (error) {
        // ignore if missing
      }
    };

    await removeIndexSafe("quote_likes", "idx_quote_likes_quote_id");
    await removeIndexSafe("quote_likes", "idx_quote_likes_user_id");
    await removeIndexSafe("quote_likes", "uq_quote_likes_quote_user");

    await queryInterface.dropTable("quote_likes");
  },
};
