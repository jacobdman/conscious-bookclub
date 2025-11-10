/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create feed_read_status table
    await queryInterface.createTable("feed_read_status", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        references: {
          model: "users",
          key: "uid",
        },
        onDelete: "CASCADE",
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
      last_read_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });

    // Add unique constraint on (user_id, club_id)
    await queryInterface.addIndex(
        "feed_read_status",
        ["user_id", "club_id"],
        {
          unique: true,
          name: "feed_read_status_user_club_unique",
        },
    );

    // Add index for faster lookups
    await queryInterface.addIndex("feed_read_status", ["user_id"], {
      name: "feed_read_status_user_id_idx",
    });
    await queryInterface.addIndex("feed_read_status", ["club_id"], {
      name: "feed_read_status_club_id_idx",
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex("feed_read_status", "feed_read_status_user_club_unique");
    await queryInterface.removeIndex("feed_read_status", "feed_read_status_user_id_idx");
    await queryInterface.removeIndex("feed_read_status", "feed_read_status_club_id_idx");

    // Drop feed_read_status table
    await queryInterface.dropTable("feed_read_status");
  },
};

