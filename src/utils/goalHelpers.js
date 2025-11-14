/**
 * Utility functions for goal management and period calculations
 */

/**
 * Normalize goal type (handle variations like 'one-time' vs 'one_time')
 * @param {string} type - Goal type
 * @returns {string} - Normalized goal type
 */
export const normalizeGoalType = (type) => {
  if (!type) return type;
  return type === 'one-time' ? 'one_time' : type;
};

/**
 * Get the current period identifier for a given cadence
 * @param {string} cadence - The goal's cadence ('day', 'week', 'month', 'quarter')
 * @returns {string|null} - The period identifier or null if not applicable
 */
export const getCurrentPeriodId = (cadence) => {
  if (!cadence) return null;
  
  const now = new Date();
  
  switch(cadence) {
    case 'day':
      return now.toISOString().split('T')[0]; // "2025-10-13"
    
    case 'week':
      const weekNum = getWeekNumber(now);
      return `${now.getFullYear()}-W${weekNum}`; // "2025-W42"
    
    case 'month':
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; // "2025-10"
    
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return `${now.getFullYear()}-Q${quarter}`; // "2025-Q4"
    
    default:
      return null;
  }
};

/**
 * Get period boundaries for a given cadence
 * @param {string} cadence - The cadence ('day', 'week', 'month', 'quarter')
 * @param {Date} timestamp - Optional timestamp (defaults to now)
 * @returns {Object} - Object with start and end Date objects
 */
export const getPeriodBoundaries = (cadence, timestamp = null) => {
  const now = timestamp || new Date();
  const utcNow = new Date(now.toISOString());
  
  let start, end;
  
  switch (cadence) {
    case 'day': {
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      break;
    }
    case 'week': {
      // Week starts on Monday (ISO week)
      const dayOfWeek = utcNow.getUTCDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(utcNow);
      monday.setUTCDate(utcNow.getUTCDate() - daysToMonday);
      start = new Date(Date.UTC(monday.getUTCFullYear(), monday.getUTCMonth(), monday.getUTCDate()));
      end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 7);
      break;
    }
    case 'month': {
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth() + 1, 1));
      break;
    }
    case 'quarter': {
      const quarter = Math.floor(utcNow.getUTCMonth() / 3);
      start = new Date(Date.UTC(utcNow.getUTCFullYear(), quarter * 3, 1));
      end = new Date(Date.UTC(utcNow.getUTCFullYear(), (quarter + 1) * 3, 1));
      break;
    }
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }
  
  return {start, end};
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
 * @param {Date|string} date - The date to check (can be Date object or string)
 * @returns {boolean} - True if the date is today
 */
export const isToday = (date) => {
  if (!date) return false;
  
  const checkDate = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(checkDate.getTime())) return false;
  
  const today = new Date();
  return checkDate.toDateString() === today.toDateString();
};

/**
 * Check if a date is today or in the past
 * @param {Date|string} date - The date to check (can be Date object or string)
 * @returns {boolean} - True if the date is today or overdue
 */
export const isTodayOrOverdue = (date) => {
  if (!date) return false;
  
  const checkDate = date instanceof Date ? date : new Date(date);
  
  // Check if date is valid
  if (isNaN(checkDate.getTime())) return false;
  
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  
  return checkDate <= today;
};

/**
 * Sort goals by priority for quick completion view
 * Priority order: daily habits → one-time/milestones → weekly habits
 * @param {Array} goals - Array of goal objects
 * @returns {Array} - Sorted goals array
 */
export const sortGoalsByPriority = (goals) => {
  return goals.sort((a, b) => {
    // Normalize types
    const aType = normalizeGoalType(a.type);
    const bType = normalizeGoalType(b.type);
    
    // Daily cadence goals first
    if (a.cadence === 'day' && b.cadence !== 'day') return -1;
    if (b.cadence === 'day' && a.cadence !== 'day') return 1;
    
    // Then one-time and milestone goals (prioritize incomplete ones)
    const aIsOneTimeOrMilestone = (aType === 'one_time' || aType === 'milestone') && !a.completed;
    const bIsOneTimeOrMilestone = (bType === 'one_time' || bType === 'milestone') && !b.completed;
    
    if (aIsOneTimeOrMilestone && !bIsOneTimeOrMilestone) return -1;
    if (bIsOneTimeOrMilestone && !aIsOneTimeOrMilestone) return 1;
    
    // Then weekly cadence goals
    if (a.cadence === 'week' && b.cadence !== 'week') return -1;
    if (b.cadence === 'week' && a.cadence !== 'week') return 1;
    
    // Finally, sort by creation date (newest first)
    return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
  });
};

/**
 * Filter goals that should appear in quick completion view
 * @param {Array} goals - Array of goal objects
 * @returns {Array} - Filtered goals that need attention
 */
export const filterGoalsForQuickCompletion = (goals) => {
  return goals.filter(goal => {
    // Skip archived goals (but allow completed goals - they'll be handled per type)
    if (goal.archived) return false;
    
    // Normalize goal type for consistent matching
    const goalType = normalizeGoalType(goal.type);
    
    switch (goalType) {
      case 'habit':
      case 'metric':
        // Show all active habit/metric goals with cadence (not completed)
        return !goal.completed && goal.cadence;
        
      case 'one_time':
        // Show incomplete one-time goals, OR completed ones that were completed today
        if (!goal.completed) {
          return true; // Always show incomplete ones
        }
        // If completed, check if it was completed today
        if (goal.completedAt || goal.completed_at) {
          const completedDate = new Date(goal.completedAt || goal.completed_at);
          const todayBoundaries = getTodayBoundaries();
          const wasCompletedToday = completedDate >= todayBoundaries.start && completedDate < todayBoundaries.end;
          return wasCompletedToday;
        }
        return false;
        
      case 'milestone':
        // Show if has any milestones (completed or incomplete)
        // Note: milestone goals may not have due dates on individual milestones
        return goal.milestones && goal.milestones.length > 0;
        
      default:
        return false;
    }
  });
};

/**
 * Get today's date boundaries (start and end of today in UTC)
 * @returns {Object} - Object with start and end Date objects for today
 */
export const getTodayBoundaries = () => {
  const now = new Date();
  const utcNow = new Date(now.toISOString());
  
  const start = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate()));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  
  return {start, end};
};

/**
 * Check if a habit has an entry for today
 * @param {Array} entries - Array of entry objects
 * @returns {boolean} - True if any entry exists for today
 */
export const hasEntryToday = (entries) => {
  if (!entries || entries.length === 0) return false;
  
  const {start, end} = getTodayBoundaries();
  
  return entries.some(entry => {
    const entryDate = new Date(entry.occurred_at || entry.occurredAt);
    return entryDate >= start && entryDate < end;
  });
};

/**
 * Get entries for today
 * @param {Array} entries - Array of entry objects
 * @returns {Array} - Filtered entries for today
 */
export const getTodayEntries = (entries) => {
  if (!entries || entries.length === 0) return [];
  
  const {start, end} = getTodayBoundaries();
  
  return entries.filter(entry => {
    const entryDate = new Date(entry.occurred_at || entry.occurredAt);
    return entryDate >= start && entryDate < end;
  });
};

/**
 * Format progress text for display
 * @param {Object} goal - Goal object
 * @param {Object} progress - Progress object with actual, target, unit
 * @returns {string} - Formatted progress text
 */
export const getProgressText = (goal, progress) => {
  if (!progress) return '';
  
  if (goal.type === 'metric' && progress.unit) {
    return `${parseFloat(progress.actual || 0).toFixed(1)} / ${parseFloat(progress.target || 0).toFixed(1)} ${progress.unit}`;
  } else if (goal.type === 'habit') {
    return `${progress.actual || 0} / ${progress.target || 0} times`;
  }
  
  return '';
};

/**
 * Get the next incomplete milestone
 * @param {Array} milestones - Array of milestone objects
 * @returns {Object|null} - Next incomplete milestone or null
 */
export const getNextIncompleteMilestone = (milestones) => {
  if (!milestones || milestones.length === 0) return null;
  return milestones.find(m => !m.done) || null;
};

/**
 * Get milestones completed today
 * @param {Array} milestones - Array of milestone objects
 * @returns {Array} - Milestones completed today
 */
export const getCompletedMilestonesToday = (milestones) => {
  if (!milestones || milestones.length === 0) return [];
  
  return milestones.filter(m => {
    if (!m.done || !m.doneAt) return false;
    return isToday(m.doneAt);
  });
};

/**
 * Format milestone goal display text
 * Shows completed milestones from today (strikethrough) + next incomplete
 * @param {Object} goal - Goal object with milestones
 * @returns {Array} - Array of milestone display objects with text and completed flag
 */
export const formatMilestoneDisplay = (goal) => {
  if (!goal.milestones || goal.milestones.length === 0) {
    return [{text: goal.title, completed: false}];
  }
  
  // Sort milestones by order (lowest first)
  const sortedMilestones = [...goal.milestones].sort((a, b) => {
    const aOrder = a.order !== undefined ? a.order : (a.id || a.ID || 0);
    const bOrder = b.order !== undefined ? b.order : (b.id || b.ID || 0);
    return aOrder - bOrder;
  });
  
  const completedToday = getCompletedMilestonesToday(sortedMilestones);
  const nextIncomplete = getNextIncompleteMilestone(sortedMilestones);
  
  const display = [];
  
  // Add completed milestones from today (with strikethrough), sorted by order
  completedToday.sort((a, b) => {
    const aOrder = a.order !== undefined ? a.order : (a.id || a.ID || 0);
    const bOrder = b.order !== undefined ? b.order : (b.id || b.ID || 0);
    return aOrder - bOrder;
  }).forEach(m => {
    display.push({
      text: `${goal.title}: ${m.title}`,
      completed: true,
      milestone: m,
    });
  });
  
  // Add next incomplete milestone
  if (nextIncomplete) {
    display.push({
      text: `${goal.title}: ${nextIncomplete.title}`,
      completed: false,
      milestone: nextIncomplete,
    });
  }
  
  // If no next incomplete and no completed today, show goal title
  if (display.length === 0) {
    display.push({
      text: goal.title,
      completed: false,
    });
  }
  
  return display;
};

/**
 * Get display label for a goal type
 * @param {Object} goal - Goal object
 * @returns {string} - Formatted type label
 */
export const getGoalTypeLabel = (goal) => {
  const goalType = normalizeGoalType(goal.type);
  switch (goalType) {
    case 'habit': 
      return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Habit` : 'Habit';
    case 'metric': 
      return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Metric` : 'Metric';
    case 'milestone': 
      return 'Milestone';
    case 'one_time':
      return 'One-time';
    default: 
      return goal.type || 'Goal';
  }
};

/**
 * Get color for a goal type (for MUI Chip/Button color prop)
 * @param {string} goalType - Goal type string
 * @returns {string} - MUI color name
 */
export const getGoalTypeColor = (goalType) => {
  const normalizedType = normalizeGoalType(goalType);
  switch (normalizedType) {
    case 'habit': 
      return 'success';
    case 'metric': 
      return 'warning';
    case 'milestone': 
      return 'secondary';
    case 'one_time':
      return 'primary';
    default: 
      return 'default';
  }
};

/**
 * Format a date/timestamp for display
 * @param {Date|string|number} timestamp - Date to format
 * @returns {string} - Formatted date string or error message
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return 'No date';
  try {
    if (timestamp instanceof Date) return timestamp.toLocaleDateString();
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
  } catch (error) {
    return 'Invalid date';
  }
};

/**
 * Get progress info text for a goal
 * @param {Object} goal - Goal object with progress
 * @returns {string} - Formatted progress info text
 */
export const getProgressInfo = (goal) => {
  const progress = goal.progress;
  const goalType = normalizeGoalType(goal.type);
  
  switch (goalType) {
    case 'one_time':
      return goal.completed ? 'Completed' : `Due: ${formatDate(goal.dueAt || goal.due_at)}`;
    case 'milestone':
      const completedMilestones = goal.milestones?.filter(m => m.done).length || 0;
      const totalMilestones = goal.milestones?.length || 0;
      return `${completedMilestones}/${totalMilestones} milestones`;
    case 'habit':
    case 'metric':
      if (progress) {
        return getProgressText(goal, progress);
      }
      // Fallback to target info
      if (goalType === 'habit') {
        return goal.cadence ? `Target: ${goal.targetCount || goal.target_count || 0} times/${goal.cadence}` : 'No target set';
      } else {
        return goal.cadence ? `Target: ${goal.targetQuantity || goal.target_quantity || 0} ${goal.unit || ''}/${goal.cadence}` : 'No target set';
      }
    default:
      return 'No progress info';
  }
};

/**
 * Calculate progress bar value (0-100) for a goal
 * @param {Object} goal - Goal object with progress
 * @returns {number} - Progress percentage (0-100)
 */
export const getProgressBarValue = (goal) => {
  const progress = goal.progress;
  if (!progress || !progress.target) return 0;
  return Math.min((progress.actual / progress.target) * 100, 100);
};
