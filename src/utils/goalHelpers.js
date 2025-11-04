/**
 * Utility functions for goal management and period calculations
 */

/**
 * Get the current period identifier for a given tracking type
 * @param {string} trackingType - The goal's tracking type (daily, weekly, monthly, quarterly)
 * @returns {string|null} - The period identifier or null if not applicable
 */
export const getCurrentPeriodId = (trackingType) => {
  const now = new Date();
  
  switch(trackingType) {
    case 'daily':
      return now.toISOString().split('T')[0]; // "2025-10-13"
    
    case 'weekly':
      const weekNum = getWeekNumber(now);
      return `${now.getFullYear()}-W${weekNum}`; // "2025-W42"
    
    case 'monthly':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "2025-10"
    
    case 'quarterly':
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return `${now.getFullYear()}-Q${quarter}`; // "2025-Q4"
    
    default:
      return null;
  }
};

/**
 * Get the week number of the year for a given date
 * @param {Date} date - The date to get the week number for
 * @returns {number} - The week number (1-53)
 */
export const getWeekNumber = (date) => {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
};

/**
 * Check if a date is today
 * @param {Date|Object|string} date - The date to check (can be Firestore timestamp, Date object, or string)
 * @returns {boolean} - True if the date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  
  let checkDate;
  if (date instanceof Date) {
    checkDate = date;
  } else if (date.seconds) {
    checkDate = new Date(date.seconds * 1000);
  } else {
    checkDate = new Date(date);
  }
  
  // Check if date is valid
  if (isNaN(checkDate.getTime())) return false;
  
  const today = new Date();
  return checkDate.toDateString() === today.toDateString();
};

/**
 * Check if a date is today or in the past
 * @param {Date|Object|string} date - The date to check (can be Firestore timestamp, Date object, or string)
 * @returns {boolean} - True if the date is today or overdue
 */
export const isTodayOrOverdue = (date) => {
  if (!date) return false;
  
  let checkDate;
  if (date instanceof Date) {
    checkDate = date;
  } else if (date.seconds) {
    checkDate = new Date(date.seconds * 1000);
  } else {
    checkDate = new Date(date);
  }
  
  // Check if date is valid
  if (isNaN(checkDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  return checkDate <= today;
};

/**
 * Sort goals by priority for quick completion view
 * Priority order: daily → overdue one-time/milestones → weekly
 * @param {Array} goals - Array of goal objects
 * @returns {Array} - Sorted goals array
 */
export const sortGoalsByPriority = (goals) => {
  return goals.sort((a, b) => {
    // Daily goals first
    if (a.trackingType === 'daily' && b.trackingType !== 'daily') return -1;
    if (b.trackingType === 'daily' && a.trackingType !== 'daily') return 1;
    
    // Then overdue one-time and milestone goals
    const aIsOverdue = (a.trackingType === 'one-time' && isTodayOrOverdue(a.dueDate) && !a.completed) ||
                      (a.trackingType === 'milestones' && a.milestones?.some(m => isTodayOrOverdue(m.dueDate) && !m.completed));
    const bIsOverdue = (b.trackingType === 'one-time' && isTodayOrOverdue(b.dueDate) && !b.completed) ||
                      (b.trackingType === 'milestones' && b.milestones?.some(m => isTodayOrOverdue(m.dueDate) && !m.completed));
    
    if (aIsOverdue && !bIsOverdue) return -1;
    if (bIsOverdue && !aIsOverdue) return 1;
    
    // Then weekly goals
    if (a.trackingType === 'weekly' && b.trackingType !== 'weekly') return -1;
    if (b.trackingType === 'weekly' && a.trackingType !== 'weekly') return 1;
    
    // Finally, sort by creation date (newest first)
    return new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt) - 
           new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt);
  });
};

/**
 * Filter goals that should appear in quick completion view
 * @param {Array} goals - Array of goal objects
 * @returns {Array} - Filtered goals that need attention
 */
export const filterGoalsForQuickCompletion = (goals) => {
  return goals.filter(goal => {
    // Skip completed goals
    if (goal.completed) return false;
    
    switch (goal.trackingType) {
      case 'daily':
        // Show all active daily goals
        return !goal.completed;
        
      case 'weekly':
        // Show all active weekly goals
        return !goal.completed;
        
      case 'one-time':
        // Show if due today, overdue, or has no due date (always show incomplete one-time goals)
        return !goal.completed && (isTodayOrOverdue(goal.dueDate) || !goal.dueDate);
        
      case 'milestones':
        // Show if has any milestones (completed or incomplete) due today or overdue
        return goal.milestones?.some(milestone => 
          isTodayOrOverdue(milestone.dueDate)
        );
        
      default:
        return false;
    }
  });
};
