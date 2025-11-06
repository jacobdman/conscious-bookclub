# Sequelize Migrations

This project uses Sequelize migrations to manage database schema changes.

## Setup

1. Ensure `DATABASE_URL` environment variable is set in your `.env` file or Firebase config:
   ```
   DATABASE_URL=postgresql://username:password@host:port/database
   ```

2. Migrations are configured in:
   - `.sequelizerc` - Paths configuration
   - `config/database.js` - Database connection configuration

## Running Migrations

### Run all pending migrations
```bash
npm run migrate
```

### Check migration status
```bash
npm run migrate:status
```

### Undo the last migration
```bash
npm run migrate:undo
```

### Undo all migrations
```bash
npm run migrate:undo:all
```

## Available Migrations

- `20251104035610-update-goals-system.js` - Updates goals table and creates goal_entry and milestone tables

## Notes

- Migrations are idempotent - they check if tables/columns/indexes exist before creating them
- Always backup your database before running migrations in production
- The migration will safely remove old columns (`frequency`, `milestones` JSONB) if they exist

