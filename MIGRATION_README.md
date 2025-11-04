# Firestore to PostgreSQL Migration

This document describes the migration from Firestore to PostgreSQL with a feature toggle system.

## Overview

The migration includes:
- PostgreSQL database with Sequelize ORM
- Express API layer in Firebase Cloud Functions
- Feature toggle to switch between Firestore and PostgreSQL
- Automatic stats calculation (no separate tables needed)
- Data migration script

## Setup Instructions

### 1. Database Setup

1. Set up a PostgreSQL database (local or cloud)
2. Run the schema creation script:
   ```bash
   psql -d your_database -f functions/schema.sql
   ```

### 2. Environment Configuration

#### Backend (functions/.env)
```bash
USE_POSTGRES=false
DATABASE_URL=postgresql://username:password@localhost:5432/conscious_bookclub
```

#### Frontend (.env)
```bash
REACT_APP_USE_POSTGRES=true
REACT_APP_API_URL=http://localhost:5001/conscious-bookclub-87073-9eb71/us-central1/api
```

### 3. Install Dependencies

```bash
# Install new backend dependencies
cd functions
npm install

# Install frontend dependencies (if needed)
cd ..
npm install
```

### 4. Deploy Functions

```bash
firebase deploy --only functions
```

## Feature Toggle Usage

### Testing with Firestore (Default)
Set both environment variables to `false`:
- `USE_POSTGRES=false` (backend)
- `REACT_APP_USE_POSTGRES=false` (frontend)

### Testing with PostgreSQL
Set both environment variables to `true`:
- `USE_POSTGRES=true` (backend)
- `REACT_APP_USE_POSTGRES=true` (frontend)

## Data Migration

To migrate existing Firestore data to PostgreSQL:

1. Set up PostgreSQL database
2. Set `USE_POSTGRES=true` in functions/.env
3. Run the migration script:
   ```bash
   cd functions
   node migrate.js
   ```

## API Endpoints

The new API provides these endpoints:

### Books
- `GET /v1/books` - Get books with pagination
- `GET /v1/books/discussed` - Get books with discussion dates
- `GET /v1/books/filtered` - Get books filtered by theme
- `GET /v1/books/:id` - Get single book
- `POST /v1/books` - Create book
- `PUT /v1/books/:id` - Update book
- `DELETE /v1/books/:id` - Delete book

### Goals
- `GET /v1/goals/:userId` - Get user's goals
- `POST /v1/goals/:userId` - Create goal
- `PUT /v1/goals/:userId/:goalId` - Update goal
- `DELETE /v1/goals/:userId/:goalId` - Delete goal
- `POST /v1/goals/:userId/:goalId/complete` - Mark goal complete

### Posts
- `GET /v1/posts` - Get all posts
- `POST /v1/posts` - Create post

### Progress
- `GET /v1/progress/:userId/:bookId` - Get user's book progress
- `PUT /v1/progress/:userId/:bookId` - Update book progress
- `DELETE /v1/progress/:userId/:bookId` - Delete book progress
- `GET /v1/progress/user/:userId` - Get all user progress
- `GET /v1/progress/book/:bookId` - Get all book progress

### Stats (Computed)
- `GET /v1/stats/users/:userId` - Get user stats
- `GET /v1/stats/books/:bookId` - Get book stats
- `GET /v1/stats/leaderboard` - Get leaderboard

### Users
- `GET /v1/users` - Get all users
- `GET /v1/users/:userId` - Get single user
- `POST /v1/users` - Create user

### Meetings
- `GET /v1/meetings` - Get all meetings

## Database Schema

### Tables
- `users` - User profiles
- `books` - Book catalog with Google Books ID
- `meetings` - Club meetings
- `posts` - Feed posts
- `goals` - User goals
- `goal_completions` - Goal completion tracking
- `book_progress` - Reading progress

### Key Features
- Snake_case column names (PostgreSQL convention)
- JSONB for arrays (theme, milestones, reaction_counts)
- Unique constraints for lookups
- Proper foreign key relationships
- Computed stats (no separate tables)

## Rollback Plan

If issues arise:
1. Set `USE_POSTGRES=false` in both frontend and backend
2. Redeploy functions: `firebase deploy --only functions`
3. The Firestore code remains intact and functional

## Development

### Local Testing
1. Start Firebase emulators: `firebase emulators:start`
2. Set environment variables for local development
3. Test with both feature flag states

### Production Deployment
1. Set up production PostgreSQL database
2. Configure environment variables
3. Run migration script
4. Deploy with `USE_POSTGRES=true`
5. Monitor and verify functionality

## Notes

- Stats are computed on-demand (no separate tables)
- Google Books ID is stored to prevent duplicates
- All timestamps use PostgreSQL's TIMESTAMP WITH TIME ZONE
- The migration maintains data integrity and relationships
