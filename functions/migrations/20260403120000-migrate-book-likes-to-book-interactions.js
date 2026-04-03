/* eslint-disable new-cap */

/**
 * Backfill book_interactions (action = like) from legacy book_likes.
 * Idempotent: ON CONFLICT DO NOTHING. Verifies every book_likes row has a matching interaction.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = await queryInterface.tableExists("book_likes");
    if (!tableExists) {
      return;
    }

    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "postgres") {
      throw new Error("migrate-book-likes-to-interactions only supports postgres");
    }

    await queryInterface.sequelize.query(
        `
        INSERT INTO book_interactions (book_id, user_id, action, created_at, updated_at)
        SELECT bl.book_id, bl.user_id, 'like', bl.created_at, bl.created_at
        FROM book_likes bl
        ON CONFLICT (book_id, user_id, action) DO NOTHING
        `,
    );

    const [orphanRows] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*)::int AS c
        FROM book_likes bl
        WHERE NOT EXISTS (
          SELECT 1 FROM book_interactions bi
          WHERE bi.book_id = bl.book_id
            AND bi.user_id = bl.user_id
            AND bi.action = 'like'
        )
        `,
    );
    const orphanRow = Array.isArray(orphanRows) && orphanRows[0];
    const orphanCount = orphanRow && orphanRow.c != null ? parseInt(orphanRow.c, 10) : 0;
    if (orphanCount > 0) {
      throw new Error(
          `migrate-book-likes-to-interactions: ${orphanCount} ` +
          `book_likes rows lack a like interaction`,
      );
    }
  },

  async down() {
    // Irreversible: cannot reconstruct book_likes without snapshot.
  },
};
