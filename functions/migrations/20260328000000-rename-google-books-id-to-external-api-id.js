/* eslint-disable new-cap */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (tableDefinition.external_api_id) {
      return;
    }

    if (!tableDefinition.google_books_id) {
      return;
    }

    await queryInterface.renameColumn("books", "google_books_id", "external_api_id");

    await queryInterface.sequelize.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'idx_books_google_books_id'
  ) THEN
    EXECUTE 'ALTER INDEX idx_books_google_books_id RENAME TO idx_books_external_api_id';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'books_google_books_id_key'
  ) THEN
    EXECUTE 'ALTER INDEX books_google_books_id_key RENAME TO books_external_api_id_key';
  END IF;
END $$;
`);
  },

  async down(queryInterface) {
    const tableDefinition = await queryInterface.describeTable("books");
    if (tableDefinition.google_books_id) {
      return;
    }

    if (!tableDefinition.external_api_id) {
      return;
    }

    await queryInterface.renameColumn("books", "external_api_id", "google_books_id");

    await queryInterface.sequelize.query(`
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'idx_books_external_api_id'
  ) THEN
    EXECUTE 'ALTER INDEX idx_books_external_api_id RENAME TO idx_books_google_books_id';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'i' AND c.relname = 'books_external_api_id_key'
  ) THEN
    EXECUTE 'ALTER INDEX books_external_api_id_key RENAME TO books_google_books_id_key';
  END IF;
END $$;
`);
  },
};
