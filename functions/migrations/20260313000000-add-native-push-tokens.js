/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const exists = await queryInterface.tableExists("native_push_tokens");
    if (!exists) {
      await queryInterface.createTable("native_push_tokens", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
        },
        user_id: {
          type: Sequelize.STRING(255),
          allowNull: false,
          references: { model: "users", key: "uid" },
          onDelete: "CASCADE",
        },
        token: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        platform: {
          type: Sequelize.STRING(20),
          allowNull: false,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("NOW()"),
        },
      });
      await queryInterface.addIndex("native_push_tokens", ["user_id"], {
        name: "idx_native_push_tokens_user_id",
      });
      await queryInterface.addIndex("native_push_tokens", ["user_id", "platform"], {
        name: "idx_native_push_tokens_user_platform",
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable("native_push_tokens");
  },
};
