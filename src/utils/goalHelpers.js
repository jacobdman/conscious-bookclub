/**
 * Utility functions for goal management and period calculations
 */

import { formatLocalDate, parseLocalDate } from 'utils/dateHelpers';

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
      return formatLocalDate(now); // "2025-10-13"
    
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
  const now = timestamp ? new Date(timestamp) : new Date();
  
  let start, end;
  
  switch (cadence) {
    case 'day': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    }
    case 'week': {
      // Week starts on Sunday (local week)
      const sunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
      start = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      break;
    }
    case 'month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    }
    case 'quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
      break;
    }
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }
  
  return {start, end};
};

export const getGoalTargetValue = (goal) => {
  if (!goal) return 0;
  if (goal.measure === 'sum') {
    return parseFloat(goal.targetQuantity || goal.target || 0);
  }
  return parseFloat(goal.targetCount || goal.target || 0);
};

export const getGoalStreakSummary = (goal, entries = []) => {
  if (!goal || !Array.isArray(entries) || entries.length === 0) {
    return null;
  }
  if (goal.type !== 'habit' && goal.type !== 'metric') {
    return null;
  }

  const targetValue = getGoalTargetValue(goal);
  if (!targetValue) return null;

  if (goal.cadence === 'day') {
    const dailyActual = {};
    entries.forEach((entry) => {
      const entryDate = new Date(entry.occurred_at || entry.occurredAt || 0);
      if (Number.isNaN(entryDate.getTime())) return;
      const dateKey = formatLocalDate(entryDate);
      const increment = goal.measure === 'sum' ? (parseFloat(entry.quantity) || 0) : 1;
      dailyActual[dateKey] = (dailyActual[dateKey] || 0) + increment;
    });

    const completedDates = Object.keys(dailyActual).filter(
      (dateKey) => dailyActual[dateKey] >= targetValue
    );
    if (completedDates.length === 0) return null;

    const sortedDates = completedDates
      .map((dateKey) => parseLocalDate(dateKey))
      .filter(Boolean)
      .sort((a, b) => a - b);

    let longest = 1;
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i += 1) {
      const prev = sortedDates[i - 1];
      const current = sortedDates[i];
      const diffDays = Math.round((current - prev) / 86400000);
      if (diffDays === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
      longest = Math.max(longest, streak);
    }

    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let currentStreak = 0;
    let cursor = currentDate;
    const completedSet = new Set(completedDates);
    while (completedSet.has(formatLocalDate(cursor))) {
      currentStreak += 1;
      const next = new Date(cursor);
      next.setDate(next.getDate() - 1);
      cursor = next;
    }

    return {
      currentLabel: 'Current streak',
      longestLabel: 'Longest streak',
      currentValue: `${currentStreak} day${currentStreak === 1 ? '' : 's'}`,
      longestValue: `${longest} day${longest === 1 ? '' : 's'}`,
    };
  }

  if (goal.cadence === 'week') {
    const weeklyActual = {};
    entries.forEach((entry) => {
      const entryDate = new Date(entry.occurred_at || entry.occurredAt || 0);
      if (Number.isNaN(entryDate.getTime())) return;
      const { start } = getPeriodBoundaries('week', entryDate);
      const weekKey = formatLocalDate(start);
      const increment = goal.measure === 'sum' ? (parseFloat(entry.quantity) || 0) : 1;
      weeklyActual[weekKey] = (weeklyActual[weekKey] || 0) + increment;
    });

    const entryDates = entries
      .map((entry) => new Date(entry.occurred_at || entry.occurredAt || 0))
      .filter((date) => !Number.isNaN(date.getTime()));
    if (entryDates.length === 0) return null;

    const earliest = entryDates.reduce((min, date) => (date < min ? date : min), entryDates[0]);
    const { start: earliestWeek } = getPeriodBoundaries('week', earliest);
    const { start: currentWeek } = getPeriodBoundaries('week', new Date());

    let longest = 0;
    let streak = 0;
    const completedWeeks = new Set();

    const cursor = new Date(earliestWeek);
    while (cursor <= currentWeek) {
      const weekKey = formatLocalDate(cursor);
      const actual = weeklyActual[weekKey] || 0;
      const completed = actual >= targetValue;
      if (completed) {
        streak += 1;
        completedWeeks.add(weekKey);
      } else {
        streak = 0;
      }
      longest = Math.max(longest, streak);
      cursor.setDate(cursor.getDate() + 7);
    }

    let currentStreak = 0;
    const currentCursor = new Date(currentWeek);
    if (!completedWeeks.has(formatLocalDate(currentCursor))) {
      currentCursor.setDate(currentCursor.getDate() - 7);
    }
    while (completedWeeks.has(formatLocalDate(currentCursor))) {
      currentStreak += 1;
      currentCursor.setDate(currentCursor.getDate() - 7);
    }

    return {
      currentLabel: 'Current 100% streak',
      longestLabel: 'Longest 100% streak',
      currentValue: `${currentStreak} week${currentStreak === 1 ? '' : 's'}`,
      longestValue: `${longest} week${longest === 1 ? '' : 's'}`,
    };
  }

  return null;
};

export const getGoalStreakValue = (goal, entries = []) => {
  const summary = getGoalStreakSummary(goal, entries);
  return summary?.currentValue || null;
};

/**
 * Get the week number of the year for a given date
 * @param {Date} date - The date to get the week number for
 * @returns {number} - The week number (1-53)
 */
export const getWeekNumber = (date) => {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const dayOffset = startOfYear.getDay();
  const startOfFirstWeek = new Date(startOfYear);
  startOfFirstWeek.setDate(startOfYear.getDate() - dayOffset);
  const diffDays = Math.floor((date - startOfFirstWeek) / 86400000);
  return Math.floor(diffDays / 7) + 1;
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
 * Priority order: due one-time → milestones → metrics → habits
 * @param {Array} goals - Array of goal objects
 * @returns {Array} - Sorted goals array
 */
export const sortGoalsByPriority = (goals) => {
  return goals.sort((a, b) => {
    // Normalize types
    const aType = normalizeGoalType(a.type);
    const bType = normalizeGoalType(b.type);

    const getPriority = (goal, goalType) => {
      if (goalType === 'one_time') {
        return goal.dueAt || goal.due_at ? 0 : 4;
      }
      if (goalType === 'milestone') return 1;
      if (goalType === 'metric') return 2;
      if (goalType === 'habit') return 3;
      return 4;
    };

    const aPriority = getPriority(a, aType);
    const bPriority = getPriority(b, bType);

    if (aPriority !== bPriority) return aPriority - bPriority;
    
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
        // Show if there is an incomplete milestone,
        // or if a milestone was completed today (so it can be undone).
        if (!goal.milestones || goal.milestones.length === 0) return false;
        if (goal.milestones.some(milestone => !milestone.done)) return true;

        const { start, end } = getTodayBoundaries();
        return goal.milestones.some(milestone => {
          const doneAt = milestone.doneAt || milestone.done_at;
          if (!doneAt) return false;
          const doneDate = new Date(doneAt);
          return doneDate >= start && doneDate < end;
        });
        
      default:
        return false;
    }
  });
};

/**
 * Get today's date boundaries (start and end of today in local time)
 * @returns {Object} - Object with start and end Date objects for today
 */
export const getTodayBoundaries = () => {
  const now = new Date();
  
  // Use local time components to get start of today
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  // End is start of tomorrow
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  
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
