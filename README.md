Setup

1. Clone
2. npm i
3. cd functions
4. npm i



Feature List
https://docs.google.com/spreadsheets/d/14JSAmY7HYBRgZbUGKXFzMQ6c31QSVHGpyOwrhzsbLJQ/edit?gid=0#gid=0

Bug Tracking
https://docs.google.com/spreadsheets/d/14JSAmY7HYBRgZbUGKXFzMQ6c31QSVHGpyOwrhzsbLJQ/edit?usp=sharing

# Schema

users { id, displayName, avatarUrl, phone, email, createdAt }

books { id, title, author, coverUrl, theme, discussionDate, createdAt }

meetings { id, theme, date, notes }

user_goals { id, userId, label, cadence, active, createdAt }

goal_checks { id, goalId, userId, date, completed } ← daily ticks

posts { id, clubId, authorId, text, createdAt, reactionCounts: {thumbsUp, thumbsDown, heart, laugh} }

post_reactions { id, postId, userId, emoji, createdAt } (unique key on {postId,userId,emoji} in SQL)
