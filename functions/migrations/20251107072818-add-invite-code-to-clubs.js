/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Wrap everything in a transaction
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Helper function to generate a random 10-character alphanumeric code
      const generateInviteCode = () => {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let code = "";
        for (let i = 0; i < 10; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      // Helper function to check if code exists
      const codeExists = async (code) => {
        const results = await queryInterface.sequelize.query(
            `SELECT COUNT(*) as count FROM clubs WHERE invite_code = :code`,
            {
              replacements: {code},
              type: Sequelize.QueryTypes.SELECT,
              transaction,
            },
        );
        return parseInt(results[0].count) > 0;
      };

      // Check if column already exists
      const tableDescription = await queryInterface.describeTable("clubs");
      const columnExists = tableDescription.invite_code !== undefined;

      // Add invite_code column if it doesn't exist
      if (!columnExists) {
        await queryInterface.addColumn("clubs", "invite_code", {
          type: Sequelize.STRING(10),
          allowNull: true, // Temporarily nullable to generate codes
          unique: true,
        }, {transaction});
      }

      // Generate unique codes for all existing clubs that don't have one
      const clubs = await queryInterface.sequelize.query(
          `SELECT id FROM clubs WHERE invite_code IS NULL`,
          {type: Sequelize.QueryTypes.SELECT, transaction},
      );

      for (const club of clubs) {
        let code;
        let attempts = 0;
        const maxAttempts = 10;

        // Generate unique code with retry logic
        do {
          code = generateInviteCode();
          attempts++;
          if (attempts >= maxAttempts) {
            throw new Error(
                `Failed to generate unique invite code for club ${club.id} ` +
                `after ${maxAttempts} attempts`);
          }
        } while (await codeExists(code));

        // Update club with generated code
        await queryInterface.sequelize.query(
            `UPDATE clubs SET invite_code = :code WHERE id = :id`,
            {
              replacements: {code, id: club.id},
              transaction,
            },
        );
      }

      // Note: invite_code is allowed to be NULL
      // Clubs with NULL invite codes cannot be joined via invite code

      // Add index for faster lookups (check if it exists first)
      try {
        await queryInterface.addIndex("clubs", ["invite_code"], {
          name: "clubs_invite_code_idx",
          unique: true,
          transaction,
        });
      } catch (error) {
        // Index might already exist, that's okay
        if (!error.message.includes("already exists")) {
          throw error;
        }
      }

      // Commit transaction
      await transaction.commit();
    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    await queryInterface.removeIndex("clubs", "clubs_invite_code_idx");

    // Remove column
    await queryInterface.removeColumn("clubs", "invite_code");
  },
};

