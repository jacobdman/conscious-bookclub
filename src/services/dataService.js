// Re-export all service functions for backward compatibility
// This file maintains backward compatibility while services are organized by domain
// New code should import directly from domain service files

// Re-export shared helpers
export { setGlobalErrorHandler } from './apiHelpers';

// Re-export from domain services
export * from './goals/goals.service';
export * from './books/books.service';
export * from './posts/posts.service';
export * from './progress/progress.service';
export * from './users/users.service';
export * from './stats/stats.service';
export * from './meetings/meetings.service';
