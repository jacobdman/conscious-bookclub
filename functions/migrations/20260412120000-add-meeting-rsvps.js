/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("meeting_rsvps", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      meeting_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {model: "meetings", key: "id"},
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
      status: {
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

    await queryInterface.sequelize.query(`
      ALTER TABLE meeting_rsvps ADD CONSTRAINT meeting_rsvps_status_check
      CHECK (status IN ('going', 'not_going', 'maybe'));
    `);

    await queryInterface.addIndex("meeting_rsvps", ["meeting_id", "user_id"], {
      unique: true,
      name: "meeting_rsvps_meeting_id_user_id_unique",
    });

    await queryInterface.addIndex("meeting_rsvps", ["meeting_id"], {
      name: "meeting_rsvps_meeting_id_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("meeting_rsvps");
  },
};
