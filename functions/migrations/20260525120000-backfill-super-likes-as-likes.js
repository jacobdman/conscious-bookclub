/* eslint-disable new-cap */

/**
 * Backfill book_interactions (action = like) for every super_like that lacks a like.
 * Idempotent: ON CONFLICT DO NOTHING.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  async up(queryInterface) {
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect !== "postgres") {
      throw new Error("backfill-super-likes-as-likes only supports postgres");
    }

    await queryInterface.sequelize.query(
        `
        INSERT INTO book_interactions (book_id, user_id, action, created_at, updated_at)
        SELECT sl.book_id, sl.user_id, 'like', sl.created_at, sl.updated_at
        FROM book_interactions sl
        WHERE sl.action = 'super_like'
          AND NOT EXISTS (
            SELECT 1 FROM book_interactions l
            WHERE l.book_id = sl.book_id
              AND l.user_id = sl.user_id
              AND l.action = 'like'
          )
        ON CONFLICT (book_id, user_id, action) DO NOTHING
        `,
    );
  },

  async down() {
    // Irreversible: cannot distinguish backfilled likes from organic ones.
  },
};
