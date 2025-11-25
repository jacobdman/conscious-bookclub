/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create pending_club_requests table
    const tableExists = await queryInterface.tableExists("pending_club_requests");
    if (!tableExists) {
      await queryInterface.createTable("pending_club_requests", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
        },
        club_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "clubs",
            key: "id",
          },
          onDelete: "CASCADE",
        },
        message: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        },
      });

      // Add indexes
      await queryInterface.addIndex("pending_club_requests", ["email"], {
        name: "idx_pending_club_requests_email",
      });

      await queryInterface.addIndex("pending_club_requests", ["club_id"], {
        name: "idx_pending_club_requests_club_id",
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    try {
      await queryInterface.removeIndex(
          "pending_club_requests",
          "idx_pending_club_requests_email",
      );
    } catch (error) {
      // Index might not exist
    }

    try {
      await queryInterface.removeIndex(
          "pending_club_requests",
          "idx_pending_club_requests_club_id",
      );
    } catch (error) {
      // Index might not exist
    }

    // Drop table
    await queryInterface.dropTable("pending_club_requests");
  },
};

