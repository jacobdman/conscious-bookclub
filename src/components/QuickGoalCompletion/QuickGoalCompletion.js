import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  LinearProgress,
  Alert,
  Chip,
  Divider,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { ExpandMore, DeleteOutline } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useGoalsContext from 'contexts/Goals';
import GoalTypeChip from 'components/GoalTypeChip';
import GoalCompletionShareDialog from 'components/GoalCompletionShareDialog';
import { createPost } from 'services/posts/posts.service';
import { updateUserProfile } from 'services/users/users.service';
import { getGoalProgress } from 'services/goals/goals.service';
import { formatSemanticDate } from 'utils/dateHelpers';
import {
  filterGoalsForQuickCompletion,
  sortGoalsByPriority,
  getTodayBoundaries,
  hasEntryToday,
  getProgressText,
  getProgressBarValue,
  formatMilestoneDisplay,
  normalizeGoalType,
  getGoalStreakValue,
} from 'utils/goalHelpers';

const QuickGoalCompletion = () => {
  const { user, userProfile, setUserProfile } = useAuth();
  const { currentClub } = useClubContext();
  const { 
    goals: allGoals, 
    updateGoal,
    createEntry,
    deleteEntry,
    updateMilestone,
    fetchGoalEntries,
    fetchGoalEntriesAll,
  } = useGoalsContext();
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [quantityDialog, setQuantityDialog] = useState({ open: false, goal: null, quantity: '' });
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [shareDialog, setShareDialog] = useState({ open: false, goal: null, label: '' });
  const longPressTimeoutRef = useRef(null);
  const longPressTriggeredRef = useRef(false);

  // Get filtered and sorted goals whenever allGoals changes
  const filteredGoals = useMemo(() => {
    const filtered = filterGoalsForQuickCompletion(allGoals);
    const sorted = sortGoalsByPriority(filtered);
    return sorted.slice(0, 5); // Limit to top 5
  }, [allGoals]);

  // Goals now include today's entries by default from the API, so no need to fetch them separately
  useEffect(() => {
    if (!user) {
      setIsCollapsed(false);
      return;
    }

    const collapsed = userProfile?.settings?.quickGoalCollapsed ?? false;
    setIsCollapsed(Boolean(collapsed));
  }, [user, userProfile]);

  const handleCollapseToggle = async () => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);

    if (!user) {
      return;
    }

    try {
      const updatedUser = await updateUserProfile(user.uid, {
        settings: {
          quickGoalCollapsed: nextCollapsed,
        },
      });
      if (updatedUser) {
        setUserProfile(updatedUser);
      }
    } catch (saveError) {
      setIsCollapsed(!nextCollapsed);
      setError('Failed to save quick goal preference');
    }
  };

  const getCompletionLabel = (goal, detail = null) => {
    const baseLabel = goal?.title || 'this goal';
    if (detail) {
      return `${baseLabel}: ${detail}`;
    }
    return baseLabel;
  };

  const openShareDialog = (goal, detail = null) => {
    setShareDialog({ open: true, goal, label: getCompletionLabel(goal, detail) });
  };

  const closeShareDialog = () => {
    setShareDialog({ open: false, goal: null, label: '' });
  };

  const handleShareConfirm = async () => {
    if (!user || !currentClub || !shareDialog.goal) {
      closeShareDialog();
      return;
    }

    try {
      let streakValue = null;
      if (shareDialog.goal.type === 'habit' || shareDialog.goal.type === 'metric') {
        const entries = await fetchGoalEntriesAll(shareDialog.goal.id);
        streakValue = getGoalStreakValue(shareDialog.goal, entries);
      }
      const completionText = streakValue
        ? `{goal_completion_post}|streak:${streakValue}`
        : '{goal_completion_post}';

      await createPost(currentClub.id, {
        text: completionText,
        isActivity: true,
        isSpoiler: false,
        relatedRecordType: 'goal',
        relatedRecordId: shareDialog.goal.id,
        authorId: user.uid,
        authorName: user.displayName || user.email,
      });
    } catch (err) {
      console.error('Failed to share goal completion:', err);
    } finally {
      closeShareDialog();
    }
  };

  const checkGoalProgressCompletion = async (goal) => {
    if (!user || !goal) return;
    if (goal.cadence === 'day') return;
    const wasCompleted = !!goal.progress?.completed;
    try {
      const progress = await getGoalProgress(user.uid, goal.id);
      if (progress?.completed && !wasCompleted) {
        openShareDialog(goal);
      }
    } catch (err) {
      console.error('Failed to check goal progress:', err);
    }
  };

  // Get completion state for a goal
  const getCompletionState = (goal) => {
    if (goal.type === 'habit' || goal.type === 'metric') {
      // Check cached entries for today
      const todayBoundaries = getTodayBoundaries();
      const cachedEntries = goal.entries || [];
      const todayEntries = cachedEntries.filter(entry => {
        const entryDate = new Date(entry.occurred_at || entry.occurredAt);
        return entryDate >= todayBoundaries.start && entryDate < todayBoundaries.end;
      });
      return todayEntries.length > 0;
    } else if (normalizeGoalType(goal.type) === 'one_time') {
      return goal.completed || false;
    } else if (goal.type === 'milestone') {
      const milestones = goal.milestones || [];
      return milestones.length > 0 && milestones.every(m => m.done);
    }
    return false;
  };


  const handleGoalToggle = async (goal) => {
    if (!user) return;

    const goalId = goal.id;
    
    // Prevent multiple clicks - check if already updating
    if (updating[goalId]) {
      return;
    }

    // Get the latest goal from context to ensure we have current state
    const currentGoal = allGoals.find(g => g.id === goalId) || goal;
    const isCurrentlyComplete = getCompletionState(currentGoal);

    try {
      setUpdating(prev => ({ ...prev, [goalId]: true }));

      if (currentGoal.type === 'habit') {
        // For habits, create or delete entry based on current state
        if (!isCurrentlyComplete) {
          // Create entry when checking
          await createEntry(goalId, {
            occurred_at: new Date().toISOString(),
            quantity: null,
          });
          await checkGoalProgressCompletion(currentGoal);
          // The createEntry function in the provider should update the state
          // The component will re-render when goals state changes
        } else {
          // Delete today's entry when unchecking
          const todayBoundaries = getTodayBoundaries();
          // Fetch today's entries if not cached
          let entries = currentGoal.entries || [];
          const todayEntries = entries.filter(entry => {
            const entryDate = new Date(entry.occurred_at || entry.occurredAt);
            return entryDate >= todayBoundaries.start && entryDate < todayBoundaries.end;
          });
          
          if (todayEntries.length === 0) {
            // Fetch entries for today
            entries = await fetchGoalEntries(goalId, 10, 0, false, todayBoundaries.start, todayBoundaries.end);
          }
          
          if (entries && entries.length > 0) {
            // Find today's entries
            const todayEntriesFiltered = entries.filter(entry => {
              const entryDate = new Date(entry.occurred_at || entry.occurredAt);
              return entryDate >= todayBoundaries.start && entryDate < todayBoundaries.end;
            });
            
            if (todayEntriesFiltered.length > 0) {
              // Delete the most recent entry for today
              const mostRecentEntry = todayEntriesFiltered.sort((a, b) => 
                new Date(b.occurred_at || b.occurredAt) - new Date(a.occurred_at || a.occurredAt)
              )[0];
              if (mostRecentEntry) {
                await deleteEntry(goalId, mostRecentEntry.id);
              }
            }
          }
        }
      } else if (currentGoal.type === 'metric') {
        // For metrics, open quantity dialog when checking, or delete entry when unchecking
        if (!isCurrentlyComplete) {
          setQuantityDialog({ open: true, goal: currentGoal, quantity: '' });
          setUpdating(prev => ({ ...prev, [goalId]: false }));
          return;
        } else {
          // Delete today's most recent entry when unchecking
          const todayBoundaries = getTodayBoundaries();
          // Fetch today's entries if not cached
          let entries = currentGoal.entries || [];
          const todayEntries = entries.filter(entry => {
            const entryDate = new Date(entry.occurred_at || entry.occurredAt);
            return entryDate >= todayBoundaries.start && entryDate < todayBoundaries.end;
          });
          
          if (todayEntries.length === 0) {
            // Fetch entries for today
            entries = await fetchGoalEntries(goalId, 10, 0, false, todayBoundaries.start, todayBoundaries.end);
          }
          
          if (entries && entries.length > 0) {
            // Find today's entries
            const todayEntriesFiltered = entries.filter(entry => {
              const entryDate = new Date(entry.occurred_at || entry.occurredAt);
              return entryDate >= todayBoundaries.start && entryDate < todayBoundaries.end;
            });
            
            if (todayEntriesFiltered.length > 0) {
              // Delete the most recent entry for today
              const mostRecentEntry = todayEntriesFiltered.sort((a, b) => 
                new Date(b.occurred_at || b.occurredAt) - new Date(a.occurred_at || a.occurredAt)
              )[0];
              if (mostRecentEntry) {
                await deleteEntry(goalId, mostRecentEntry.id);
              }
            }
          }
        }
      } else if (normalizeGoalType(currentGoal.type) === 'one_time') {
        // Toggle completion status for one-time goals
        const newCompleted = !isCurrentlyComplete;
        await updateGoal(goalId, {
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : null,
        });
        setUpdating(prev => ({ ...prev, [goalId]: false }));
        return;
      } else if (currentGoal.type === 'milestone') {
        // For milestones, toggle the next incomplete milestone or undo the last completed one
        // Sort milestones by order (lowest first) before processing
        const milestones = [...(currentGoal.milestones || [])].sort((a, b) => {
          const aOrder = a.order !== undefined ? a.order : (a.id || a.ID || 0);
          const bOrder = b.order !== undefined ? b.order : (b.id || b.ID || 0);
          return aOrder - bOrder;
        });
        const incompleteMilestone = milestones.find(m => !m.done);
        const remainingIncomplete = milestones.filter(m => !m.done);
        const isLastIncomplete = remainingIncomplete.length === 1;
        
        if (incompleteMilestone) {
          // Mark the next incomplete milestone as done
          const milestoneId = incompleteMilestone.id || incompleteMilestone.ID;
          if (!milestoneId) {
            console.error('Milestone ID not found for milestone:', incompleteMilestone);
            setUpdating(prev => ({ ...prev, [goalId]: false }));
            return;
          }
          
          const milestoneIdNum = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
          await updateMilestone(goalId, milestoneIdNum, { done: true });
          if (isLastIncomplete) {
            openShareDialog(currentGoal);
          }
        } else if (isCurrentlyComplete) {
          // If all are done and user unchecks, undo the last completed milestone from today
          const todayBoundaries = getTodayBoundaries();
          const todayStart = todayBoundaries.start;
          const todayEnd = todayBoundaries.end;
          
          // Find the most recently completed milestone that was done today
          const completedToday = milestones
            .filter(m => {
              const doneAt = m.doneAt || m.done_at;
              if (!doneAt) return false;
              const doneDate = new Date(doneAt);
              return doneDate >= todayStart && doneDate < todayEnd;
            })
            .sort((a, b) => {
              const aDate = new Date(a.doneAt || a.done_at);
              const bDate = new Date(b.doneAt || b.done_at);
              return bDate - aDate;
            });
          
          if (completedToday.length > 0) {
            const milestoneToUndo = completedToday[0];
            const milestoneId = milestoneToUndo.id || milestoneToUndo.ID;
            if (!milestoneId) {
              console.error('Milestone ID not found for milestone:', milestoneToUndo);
              setUpdating(prev => ({ ...prev, [goalId]: false }));
              return;
            }
            
            const milestoneIdNum = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
            await updateMilestone(goalId, milestoneIdNum, { done: false, doneAt: null });
          }
        }
        setUpdating(prev => ({ ...prev, [goalId]: false }));
        return;
      }
    } catch (err) {
      setError('Failed to update goal');
    } finally {
      setUpdating(prev => ({ ...prev, [goalId]: false }));
    }
  };

  const handleQuickAdd = async (goal) => {
    if (!user || !goal) return;

    const goalId = goal.id;
    if (updating[goalId]) {
      return;
    }

    const currentGoal = allGoals.find(g => g.id === goalId) || goal;

    try {
      if (currentGoal.type === 'metric') {
        setQuantityDialog({ open: true, goal: currentGoal, quantity: '' });
        return;
      }

      if (currentGoal.type === 'habit') {
        setUpdating(prev => ({ ...prev, [goalId]: true }));
        await createEntry(goalId, {
          occurred_at: new Date().toISOString(),
          quantity: null,
        });
        await checkGoalProgressCompletion(currentGoal);
      }
    } catch (err) {
      setError('Failed to create entry');
    } finally {
      setUpdating(prev => ({ ...prev, [goalId]: false }));
    }
  };

  const handleRowClick = (goal) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    handleQuickAdd(goal);
  };

  const handleTouchStart = (goal, canDelete) => {
    if (!canDelete) return;
    longPressTriggeredRef.current = false;
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
    }
    longPressTimeoutRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      handleGoalToggle(goal);
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  };

  const getLatestEntry = (goal) => {
    const entries = goal.entries || [];
    if (entries.length === 0) return null;

    let latestEntry = null;
    entries.forEach(entry => {
      const entryDate = new Date(entry.occurred_at || entry.occurredAt);
      if (Number.isNaN(entryDate.getTime())) return;
      if (!latestEntry) {
        latestEntry = entry;
        return;
      }
      const latestDate = new Date(latestEntry.occurred_at || latestEntry.occurredAt);
      if (entryDate > latestDate) {
        latestEntry = entry;
      }
    });

    return latestEntry;
  };

  const handleQuantitySubmit = async () => {
    if (!user || !quantityDialog.goal) return;

    const goal = quantityDialog.goal;
    const quantity = parseFloat(quantityDialog.quantity || 0);

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    try {
      setUpdating(prev => ({ ...prev, [goal.id]: true }));
      setQuantityDialog({ open: false, goal: null, quantity: '' });

      await createEntry(goal.id, {
        occurred_at: new Date().toISOString(),
        quantity: quantity,
      });
      await checkGoalProgressCompletion(goal);
    } catch (err) {
      setError('Failed to create entry');
    } finally {
      setUpdating(prev => ({ ...prev, [goal.id]: false }));
    }
  };

  const getGoalDisplayText = (goal) => {
    if (goal.type === 'milestone') {
      const display = formatMilestoneDisplay(goal);
      // Return the next incomplete milestone text (last item)
      return display.length > 0 ? display[display.length - 1].text : goal.title;
    }
    return goal.title;
  };

  const getGoalDisplayItems = (goal) => {
    if (goal.type === 'milestone') {
      return formatMilestoneDisplay(goal);
    }
    return [{ text: goal.title, completed: getCompletionState(goal) }];
  };


  const renderGoalsContent = () => {
    if (error) {
      return (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      );
    }

    if (filteredGoals.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          No goals need attention right now. Great job! 🎉
        </Typography>
      );
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {filteredGoals.map((goal, index) => {
          // Get the latest goal from context to ensure we have current entries
          const latestGoal = allGoals.find(g => g.id === goal.id) || goal;
          const isComplete = getCompletionState(latestGoal);
          const isUpdating = updating[goal.id] || false;
          const displayItems = getGoalDisplayItems(latestGoal);
          const progressText = latestGoal.type === 'metric' && latestGoal.progress ? getProgressText(latestGoal, latestGoal.progress) : '';
          const latestEntry = getLatestEntry(latestGoal);
          const latestEntryDate = latestEntry ? (latestEntry.occurred_at || latestEntry.occurredAt) : null;
          const lastActivityLabel = latestEntryDate ? formatSemanticDate(latestEntryDate) : '';
          const lastActivityQuantity = latestGoal.type === 'metric' && latestEntry?.quantity !== undefined && latestEntry?.quantity !== null
            ? ` (${latestEntry.quantity})`
            : '';
          const hasTodayEntry = latestGoal.type !== 'milestone' ? hasEntryToday(latestGoal.entries || []) : false;
          const progressValue = getProgressBarValue(latestGoal);
          
          // For milestones, show completed ones first (no checkbox), then next incomplete (with checkbox)
          // For other goals, show single item with checkbox
          if (latestGoal.type === 'milestone') {
            return (
              <Box key={latestGoal.id}>
                {displayItems.map((item, itemIndex) => {
                  const itemComplete = item.completed || false;
                  const isLastItem = itemIndex === displayItems.length - 1;
                  const isNextIncomplete = isLastItem && !itemComplete;
                  
                  const labelContent = (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          textDecoration: itemComplete ? 'line-through' : 'none',
                          opacity: itemComplete ? 0.6 : 1,
                          flex: 1,
                          ml: itemComplete ? 4 : 0, // Indent completed items
                        }}
                      >
                        {item.text}
                      </Typography>
                      {isNextIncomplete && (
                        <>
                          <GoalTypeChip goal={latestGoal} />
                          {isUpdating && <CircularProgress size={16} />}
                        </>
                      )}
                    </Box>
                  );
                  
                  // Use FormControlLabel only when there's a checkbox, otherwise use Box
                  if (isNextIncomplete) {
                    return (
                      <FormControlLabel
                        key={itemIndex}
                        control={
                          <Checkbox
                            checked={false}
                            onChange={() => handleGoalToggle(latestGoal)}
                            disabled={isUpdating}
                            color="primary"
                          />
                        }
                        label={labelContent}
                        sx={{ width: '100%', m: 0 }}
                      />
                    );
                  } else {
                    return (
                      <Box key={itemIndex} sx={{ display: 'flex', alignItems: 'center', width: '100%', m: 0 }}>
                        {labelContent}
                      </Box>
                    );
                  }
                })}
                {index < filteredGoals.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </Box>
            );
          }
          
          if (latestGoal.type === 'habit' || latestGoal.type === 'metric') {
            return (
              <Box key={latestGoal.id}>
                <Box
                  role="button"
                  tabIndex={0}
                  onClick={() => handleRowClick(latestGoal)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleRowClick(latestGoal);
                    }
                  }}
                  onTouchStart={() => handleTouchStart(latestGoal, hasTodayEntry)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5,
                    width: '100%',
                    cursor: 'pointer',
                    px: 0.5,
                    py: 0.75,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {getGoalDisplayText(latestGoal)}
                      {progressText && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({progressText})
                        </Typography>
                      )}
                    </Typography>
                    <GoalTypeChip goal={latestGoal} />
                    {isUpdating && <CircularProgress size={16} />}
                    {hasTodayEntry && (
                      <IconButton
                        size="small"
                        aria-label="Delete latest entry"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleGoalToggle(latestGoal);
                        }}
                      >
                        <DeleteOutline fontSize="inherit" />
                      </IconButton>
                    )}
                  </Box>
                  {(lastActivityLabel || hasTodayEntry) && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {lastActivityLabel && (
                        <Typography variant="caption" color="text.secondary">
                          Last activity: {lastActivityLabel}{lastActivityQuantity}
                        </Typography>
                      )}
                      {hasTodayEntry && (
                        <Typography variant="caption" color="text.secondary">
                          Long-press to delete
                        </Typography>
                      )}
                    </Box>
                  )}
                  <LinearProgress
                    variant="determinate"
                    value={progressValue}
                    sx={{ height: 6, borderRadius: 999, backgroundColor: 'action.hover' }}
                  />
                </Box>
                {index < filteredGoals.length - 1 && <Divider sx={{ my: 0.5 }} />}
              </Box>
            );
          }

          // For non-milestone goals, show single item
          return (
            <Box key={latestGoal.id}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isComplete}
                    onChange={() => handleGoalToggle(latestGoal)}
                    disabled={isUpdating}
                    color="primary"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        textDecoration: isComplete ? 'line-through' : 'none',
                        opacity: isComplete ? 0.6 : 1,
                        flex: 1
                      }}
                    >
                      {getGoalDisplayText(latestGoal)}
                      {progressText && (
                        <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                          ({progressText})
                        </Typography>
                      )}
                    </Typography>
                    <GoalTypeChip goal={latestGoal} />
                    {isUpdating && <CircularProgress size={16} />}
                  </Box>
                }
                sx={{ width: '100%', m: 0 }}
              />
              {index < filteredGoals.length - 1 && <Divider sx={{ my: 0.5 }} />}
            </Box>
          );
        })}
      </Box>
    );
  };

  return (
    <>
      <Card sx={{ overflow: 'visible' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Today's Goals
            </Typography>
            <IconButton
              aria-label={isCollapsed ? 'Expand quick goals' : 'Collapse quick goals'}
              aria-expanded={!isCollapsed}
              onClick={handleCollapseToggle}
              size="small"
            >
              <ExpandMore
                sx={{
                  transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                  transition: 'transform 0.2s ease',
                }}
              />
            </IconButton>
          </Box>
          <Collapse in={!isCollapsed}>
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Track your progress for today
              </Typography>
              {renderGoalsContent()}
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      {/* Quantity Input Dialog for Metrics */}
      <Dialog open={quantityDialog.open} onClose={() => setQuantityDialog({ open: false, goal: null, quantity: '' })}>
        <DialogTitle>Add {quantityDialog.goal?.title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`Quantity (${quantityDialog.goal?.unit || 'units'})`}
            type="number"
            fullWidth
            variant="standard"
            value={quantityDialog.quantity || ''}
            onChange={(e) => setQuantityDialog(prev => ({ ...prev, quantity: e.target.value }))}
            inputProps={{ step: '0.1', min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuantityDialog({ open: false, goal: null, quantity: '' })}>Cancel</Button>
          <Button onClick={handleQuantitySubmit} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>

      <GoalCompletionShareDialog
        open={shareDialog.open}
        onClose={closeShareDialog}
        onConfirm={handleShareConfirm}
        completionLabel={shareDialog.label}
      />
    </>
  );
};

export default QuickGoalCompletion;
