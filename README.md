# Schema

users { id, displayName, avatarUrl, phone, email, createdAt }

books { id, title, author, coverUrl, theme, discussionDate, createdAt }

meetings { id, theme, date, notes }

user_goals { id, userId, label, cadence, active, createdAt }

goal_checks { id, goalId, userId, date, completed } ← daily ticks

posts { id, clubId, authorId, text, createdAt, reactionCounts: {thumbsUp, thumbsDown, heart, laugh} }

post_reactions { id, postId, userId, emoji, createdAt } (unique key on {postId,userId,emoji} in SQL)