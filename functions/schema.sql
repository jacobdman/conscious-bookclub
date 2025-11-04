-- PostgreSQL Schema for Conscious Bookclub
-- Using snake_case column names following PostgreSQL conventions

-- Users table
CREATE TABLE users (
    uid VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    google_books_id VARCHAR(255) UNIQUE,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(500),
    cover_image TEXT,
    theme JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(50) DEFAULT 'active',
    discussion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meetings table
CREATE TABLE meetings (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    location VARCHAR(255),
    book_id INTEGER REFERENCES books(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE posts (
    id SERIAL PRIMARY KEY,
    author_id VARCHAR(255) REFERENCES users(uid) ON DELETE CASCADE,
    author_name VARCHAR(255) NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reaction_counts JSONB DEFAULT '{"thumbsUp": 0, "thumbsDown": 0, "heart": 0, "laugh": 0}'::jsonb
);

-- Goals table
CREATE TABLE goals (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(uid) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'habit', 'metric', 'milestone', 'one_time'
    measure VARCHAR(50), -- 'count' or 'sum', nullable
    cadence VARCHAR(50), -- 'day', 'week', 'month', 'quarter', nullable
    target_count INTEGER,
    target_quantity NUMERIC,
    unit VARCHAR(100),
    due_at TIMESTAMP WITH TIME ZONE,
    visibility VARCHAR(50) DEFAULT 'public',
    archived BOOLEAN DEFAULT FALSE,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Goal entries table - stores individual datapoints for habit/metric goals
CREATE TABLE goal_entry (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(uid) ON DELETE CASCADE,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    quantity NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Milestones table - separate table for milestone items
CREATE TABLE milestone (
    id SERIAL PRIMARY KEY,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    done BOOLEAN DEFAULT FALSE,
    done_at TIMESTAMP WITH TIME ZONE
);

-- Goal completions table (deprecated, kept for backwards compatibility)
CREATE TABLE goal_completions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(uid) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    period_id VARCHAR(100) NOT NULL, -- e.g., '2024-01-15' for daily goals
    completed BOOLEAN DEFAULT TRUE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, goal_id, period_id)
);

-- Book progress table
CREATE TABLE book_progress (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(uid) ON DELETE CASCADE,
    book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'not_started', -- 'not_started', 'reading', 'finished'
    percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
    privacy VARCHAR(20) DEFAULT 'public', -- 'public', 'private'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, book_id)
);

-- Indexes for performance
CREATE INDEX idx_books_google_books_id ON books(google_books_id);
CREATE INDEX idx_books_status ON books(status);
CREATE INDEX idx_books_discussion_date ON books(discussion_date);
CREATE INDEX idx_meetings_date ON meetings(date);
CREATE INDEX idx_meetings_book_id ON meetings(book_id);
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_archived ON goals(archived);
CREATE INDEX idx_goals_completed ON goals(completed);
CREATE INDEX idx_goals_type ON goals(type);
CREATE INDEX idx_goal_entry_goal_id ON goal_entry(goal_id);
CREATE INDEX idx_goal_entry_user_id ON goal_entry(user_id);
CREATE INDEX idx_goal_entry_occurred_at ON goal_entry(occurred_at);
CREATE INDEX idx_milestone_goal_id ON milestone(goal_id);
CREATE INDEX idx_goal_completions_user_id ON goal_completions(user_id);
CREATE INDEX idx_goal_completions_goal_id ON goal_completions(goal_id);
CREATE INDEX idx_goal_completions_period_id ON goal_completions(period_id);
CREATE INDEX idx_book_progress_user_id ON book_progress(user_id);
CREATE INDEX idx_book_progress_book_id ON book_progress(book_id);
CREATE INDEX idx_book_progress_status ON book_progress(status);
CREATE INDEX idx_book_progress_privacy ON book_progress(privacy);
