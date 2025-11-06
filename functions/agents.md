# Coding Practices and Standards

This document outlines the coding practices, patterns, and conventions used in this codebase.

## Table of Contents
1. [API/Routes Structure](#apiroutes-structure)
2. [Controller Patterns](#controller-patterns)
3. [DB/Models Usage](#dbmodels-usage)
4. [Error Handling](#error-handling)
5. [Services Layer](#services-layer)
6. [General Practices](#general-practices)

## API/Routes Structure

### Directory Organization

Routes are organized in a versioned structure under `/functions/src/routes/v1/`:

```
routes/
├── index.js              # Root router, mounts v1 routes
└── v1/
    ├── index.js          # V1 router, mounts all v1 endpoints
    ├── goals/
    │   ├── index.js      # Exports the router
    │   ├── goals.routes.js  # Route definitions
    │   └── goals.ctrl.js    # Controller functions
    └── books/
    │   ├── index.js      # Exports the router
    │   ├── books.routes.js  # Route definitions
    │   └── books.ctrl.js    # Controller functions
    └── ...
```

### Route Module Structure

Each route module follows a consistent pattern:

1. **`[name].routes.js`** - Defines Express routes using `express.Router()`
   ```javascript
   const express = require('express');
   const { getGoal, updateGoal, deleteGoal, createGoal } = require('./goals.ctrl');
   
   const router = express.Router();
   
   router
     .get('/:goalId', getGoal)
     .put('/:goalId', updateGoal)
     .delete('/:goalId', deleteGoal)
     .post('/', createGoal);
   
   module.exports = router;
   ```

2. **`[name].ctrl.js`** - Contains controller functions (request handlers)
   - See [Controller Patterns](#controller-patterns) section for details

3. **`index.js`** - Exports the router
   ```javascript
   const goals = require("./goals.routes");
   module.exports = goals;
   ```

### Route Registration

Routes are registered hierarchically:

- **`routes/index.js`** - Mounts versioned routes
  ```javascript
  const v1Routes = require("./v1");
  router.use("/v1", v1Routes);
  ```

- **`routes/v1/index.js`** - Mounts all v1 endpoints
  ```javascript
  router.use('/goals', goals);
  router.use('/books', books);
  router.use('/healthcheck', healthcheck);
  ```

### Route Naming Conventions

- Route files use snake-case: `goals.routes.js`, `books.routes.js`, `healthcheck.routes.js`
- Controller files use snake-case: `goals.ctrl.js`, `books.ctrl.js`, `healthcheck.ctrl.js`
- Route paths use snake-case: `/goals`, `/books`, `/healthcheck`

## Controller Patterns

### Standard Handler Signature

All controllers follow the Express async handler pattern:

```javascript
const handlerName = async (req, res, next) => {
  try {
    // Handler logic
    res.json(data);
  } catch (e) {
    next(e);
  }
};
```

### Error Handling

- Always wrap controller logic in try/catch blocks
- Pass errors to Express error middleware via `next(e)`
- Never throw errors directly (they must be caught and passed to `next`)

### Helper Functions

Extract reusable logic into helper functions within the controller file:

```javascript
const getGoalById = async req => {
  const goalId = req.params.goalId;
  const goal = await db.goals.findByPk(goalId);
  if (!goal)
    throw new NotFoundError(`Could not find goal with id ${goalId}`);
  return goal;
};

const getGoal = async (req, res, next) => {
  try {
    const goal = await getGoalById(req);
    res.json(goal);
  } catch (e) {
    next(e);
  }
};
```

### Response Patterns

- Use `res.json()` for JSON responses
- Use `res.sendStatus()` for status-only responses (e.g., `res.sendStatus(StatusCodes.OK)`)
- Return data directly from database queries when appropriate

### Controller Organization

- Group related handlers in the same file
- Export all handlers from the controller file
- Import handlers in the routes file

## DB/Models Usage

### Model Location and Structure

Models are located in `/functions/src/db/models/` and follow this pattern:

```javascript
module.exports = function (sequelize, DataTypes) {
  const ModelName = sequelize.define(
    "table_name",
    {
      // Field definitions
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
        unique: true,
      },
      // ... other fields
    },
    {
      tableName: "table_name",
      paranoid: true,
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
      deletedAt: "deleted_at",
    }
  );
  
  ModelName.associate = (models) => {
    // Define relationships
  };
  
  return ModelName;
};
```

### Accessing Models

Models are accessed via the `db` object:

```javascript
// In controllers
const db = require('../../../db');
// or
const db = require('../../../db/models/index');

// Usage
const goal = await db.goals.findByPk(id);
const users = await db.users.findAll({ where: { ... } });
```

### Model Features

1. **Soft Deletes**: All models use `paranoid: true` for soft deletes
   - Records are not physically deleted
   - Use `deletedAt` timestamp to track deletions
   - Queries automatically exclude soft-deleted records

2. **Custom Timestamps**: Models use custom timestamp field names
   - `created_at` instead of `createdAt`
   - `updated_at` instead of `updatedAt`
   - `deleted_at` instead of `deletedAt`

3. **Field Validation**: Models include field-level validation (when appropriate)

   ```javascript
   name: {
     type: DataTypes.TEXT,
     allowNull: false,
     validate: {
       len: { args: [2, 255] },
     },
   }
   ```

### Model Associations

Models define relationships via the `associate` method:

```javascript
ModelName.associate = (models) => {
  ModelName.belongsTo(models.otherModel, {
    foreignKey: "foreign_key_field",
    as: "aliasName",
  });
  ModelName.belongsToMany(models.otherModel, {
    through: models.joinTable,
    foreignKey: "model_id",
    otherKey: "other_model_id",
  });
  ModelName.hasMany(models.otherModel, {
    foreignKey: "model_id",
  });
};
```

### Model Hooks

Models can define lifecycle hooks:

```javascript
ModelName.addHook("afterCreate", async (instance, options) => {
  // Post-create logic
  return instance;
});
```

### Model Auto-Loading

Models are automatically loaded from the `/db/models/` directory:

- All `.js` files (except `index.js` and utils) are treated as models
- Models are automatically associated if `associate` method exists
- Models are accessible via `db[modelName]` (e.g., `db.goals`, `db.users`)

### Query Patterns

- Use Sequelize query methods: `findByPk`, `findAll`, `findOne`, `create`, `update`, `destroy`
- Use `include` for eager loading relationships
- Use `where` clauses for filtering
- Use `attributes` to select specific fields

```javascript
const artistEvents = await db.artist_events.findAll({
  where: { artist_id: artistId },
  include: [{ model: db.events }],
});
```

## Error Handling

### Global Error Handler

Errors are caught by the global error handler in `app.js`:

```javascript
app.use((err, req, res, next) => {
  console.log("ERROR HANDLER", req.url);
  console.error(err);
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message,
    },
  });
});
```

### Error Handling Best Practices

- Always catch errors in controllers and pass to `next(e)`
- Use appropriate error types for different scenarios
- Provide descriptive error messages
- Errors include stack traces

## General Practices

### Technology Stack

- **Framework**: Express.js
- **ORM**: Sequelize
- **Database**: PostgreSQL
- **Middleware**: body-parser, cookie-parser, cors
- **Environment**: dotenv for environment variables

### Code Style

- Use `async/await` for asynchronous operations
- Use `const` and `let` (avoid `var`)
- Use ES6+ features (arrow functions, destructuring, etc.)
- Use camelCase for variables and functions
- Use snake_case for file names and route paths

### Environment Configuration

- Use `dotenv` for environment variables

### Middleware

Standard Express middleware setup:

```javascript
app.use(bodyParser.json({limit: "250kb"}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(cors({origin: true}));
```

### Database Configuration

- PostgreSQL with SSL support for production
- Connection pooling handled by Sequelize
- Custom type parsers for PostgreSQL types (e.g., `parseInt8`, decimal parsing)

### File Organization

- Keep related files together (routes, controllers in same directory)
- Use `index.js` files for clean exports
- Separate concerns: routes, controllers, models, services, utils

### Best Practices

1. **Always use async/await** - Avoid callback patterns
2. **Handle errors properly** - Always catch and pass to error middleware
3. **Validate input** - Use model validation and custom validation
4. **Use soft deletes** - Never hard-delete records
5. **Follow naming conventions** - Consistent naming makes code more maintainable
6. **Extract reusable logic** - Use helper functions and services
7. **Document complex logic** - Add comments for non-obvious code
8. **Use allowedFields** - Prevent mass assignment vulnerabilities
