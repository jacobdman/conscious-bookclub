import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Checkbox,
  TextField,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
// UI
import FullscreenDialog from 'UI/FullscreenDialog';
import { Close, Add, Edit, Delete, DragIndicator, ExpandMore, Check } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useGoalsContext from 'contexts/Goals';
import ClubGoalMembersAccordion from 'components/ClubGoalMembersAccordion';
import ClubGoalChip from 'components/ClubGoalChip';
import {
  getClubGoalEntriesReport,
  getClubGoalProgressReport,
} from 'services/reports/reports.service';
import ClubGoalDashboardSummary from 'components/DashboardClubGoals/ClubGoalDashboardSummary';
import GoalCompletionShareDialog from 'components/GoalCompletionShareDialog';
import IOSConfirmDialog from 'components/IOSConfirmDialog';
import GoalEntryDialog from 'components/Goals/GoalEntryDialog';
import MonthlyStreakGrid from 'components/MonthlyStreakGrid';
import PausedGoalChip from 'components/PausedGoalChip';
import { createPost } from 'services/posts/posts.service';
import { getGoalProgress } from 'services/goals/goals.service';
import { 
  getProgressText, 
  getProgressBarValue,
  formatDate,
  formatPauseStartForDisplay,
  getPeriodBoundaries,
  getGoalTargetValue,
  getGoalStreakSummary,
  getGoalStreakValue,
  isGoalPauseCoveringPeriod,
  isClubLinkedGoal,
  getTodayEntries,
} from 'utils/goalHelpers';
import { formatLocalDate } from 'utils/dateHelpers';

const CLUB_ENTRIES_LIMIT = 20;

const GoalDetailsModal = ({ open, onClose, goal: goalProp }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const queryClient = useQueryClient();
  const { 
    goals, 
    updateGoal,
    deleteGoal,
    pauseGoal,
    resumeGoal,
    createEntry,
    updateEntry,
    deleteEntry,
    fetchGoalEntries,
    fetchGoalEntriesForMonth,
    fetchGoalEntriesAll,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    bulkUpdateMilestones,
  } = useGoalsContext();
  const [entryDialog, setEntryDialog] = useState({ open: false, entry: null, saving: false, error: null, initialDate: null });
  const [draggedMilestoneId, setDraggedMilestoneId] = useState(null);
  const [draggedOverMilestoneId, setDraggedOverMilestoneId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingMilestones, setUpdatingMilestones] = useState({});
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [deletingMilestones, setDeletingMilestones] = useState({});
  const [milestoneDateDialog, setMilestoneDateDialog] = useState({
    open: false,
    milestoneId: null,
    value: null,
    saving: false,
  });
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [monthEntries, setMonthEntries] = useState([]);
  const [monthEntriesPool, setMonthEntriesPool] = useState([]);
  const [monthEntriesLoading, setMonthEntriesLoading] = useState(false);
  const [weekEntriesPool, setWeekEntriesPool] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [shareDialog, setShareDialog] = useState({ open: false, goal: null, label: '' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pauseConfirmOpen, setPauseConfirmOpen] = useState(false);
  const [pauseResumeLoading, setPauseResumeLoading] = useState(false);
  const [clubEntriesList, setClubEntriesList] = useState([]);
  const [clubEntriesHasMore, setClubEntriesHasMore] = useState(false);
  const [clubEntriesOffset, setClubEntriesOffset] = useState(0);
  const [clubEntriesLoading, setClubEntriesLoading] = useState(false);
  const [clubEntriesLoadingMore, setClubEntriesLoadingMore] = useState(false);
  const observerTarget = useRef(null);
  const initialEntriesLoaded = useRef({});
  const INITIAL_LIMIT = 20;
  const LOAD_MORE_LIMIT = 20;

  // Get the current goal from the provider context to ensure we have the latest version
  // This ensures the UI updates when milestones are toggled
  const goal = goalProp?.id ? goals.find(g => g.id === goalProp.id) || goalProp : goalProp;
  const isClubGoal = isClubLinkedGoal(goal);
  const clubGoalId = goal?.clubGoalId ?? goal?.club_goal_id;

  // Get entries and pagination from goal
  const entries = goal?.entries || [];
  const displayEntries = isClubGoal ? clubEntriesList : entries;
  const entriesPagination = useMemo(() => {
    return goal?.entriesPagination || { hasMore: true, offset: 0, limit: INITIAL_LIMIT };
  }, [goal?.entriesPagination]);
  const hasMore = isClubGoal ? clubEntriesHasMore : entriesPagination.hasMore;

  const clubEntriesOffsetRef = useRef(0);

  const loadClubEntries = useCallback(
    async (append = false) => {
      if (!isClubGoal || !clubGoalId || !currentClub?.id || !user?.uid) return;
      const offset = append ? clubEntriesOffsetRef.current : 0;
      try {
        if (append) {
          setClubEntriesLoadingMore(true);
        } else {
          setClubEntriesLoading(true);
        }
        const data = await getClubGoalEntriesReport(clubGoalId, currentClub.id, user.uid, {
          limit: CLUB_ENTRIES_LIMIT,
          offset,
        });
        const nextEntries = data?.entries || [];
        setClubEntriesList((prev) => (append ? [...prev, ...nextEntries] : nextEntries));
        setClubEntriesHasMore(Boolean(data?.hasMore));
        const nextOffset = offset + nextEntries.length;
        clubEntriesOffsetRef.current = nextOffset;
        setClubEntriesOffset(nextOffset);
      } catch (err) {
        console.error('Failed to load club goal entries:', err);
      } finally {
        setClubEntriesLoading(false);
        setClubEntriesLoadingMore(false);
      }
    },
    [isClubGoal, clubGoalId, currentClub?.id, user?.uid],
  );

  const refreshClubEntries = useCallback(() => {
    clubEntriesOffsetRef.current = 0;
    setClubEntriesOffset(0);
    loadClubEntries(false);
    queryClient.invalidateQueries({ queryKey: ['clubGoalEntries'] });
    queryClient.invalidateQueries({ queryKey: ['clubGoalBreakdown'] });
    queryClient.invalidateQueries({ queryKey: ['clubGoalOverview'] });
    queryClient.invalidateQueries({ queryKey: ['clubGoalProgress'] });
  }, [loadClubEntries, queryClient]);

  useEffect(() => {
    if (!open) {
      setClubEntriesList([]);
      clubEntriesOffsetRef.current = 0;
      setClubEntriesOffset(0);
      setClubEntriesHasMore(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !isClubGoal || !clubGoalId) return;
    loadClubEntries(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset list when goal/club changes
  }, [open, isClubGoal, clubGoalId, currentClub?.id, user?.uid]);

  // Load more entries when scrolling to bottom
  useEffect(() => {
    if (!open || !goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;

    const observer = new IntersectionObserver(
      async (observerEntries) => {
        if (!observerEntries[0].isIntersecting) return;
        if (isClubGoal) {
          if (!clubEntriesHasMore || clubEntriesLoadingMore || clubEntriesLoading) return;
          try {
            await loadClubEntries(true);
          } catch (err) {
            console.error('Failed to load more club entries:', err);
          }
          return;
        }
        if (!hasMore || loadingMore) return;
        try {
          setLoadingMore(true);
          const currentOffset = entriesPagination.offset || 0;
          await fetchGoalEntries(goal.id, LOAD_MORE_LIMIT, currentOffset, true);
        } catch (err) {
          console.error('Failed to load more entries:', err);
        } finally {
          setLoadingMore(false);
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [
    open,
    goal,
    isClubGoal,
    hasMore,
    loadingMore,
    entriesPagination,
    fetchGoalEntries,
    clubEntriesHasMore,
    clubEntriesLoadingMore,
    clubEntriesLoading,
    loadClubEntries,
  ]);

  // Fetch initial personal entries when modal opens (non-club history)
  useEffect(() => {
    if (!open || !goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;
    if (isClubGoal) return;

    if (!initialEntriesLoaded.current[goal.id]) {
      initialEntriesLoaded.current[goal.id] = true;
      fetchGoalEntries(goal.id, INITIAL_LIMIT, 0, false);
    }
  }, [open, goal, isClubGoal, fetchGoalEntries]);

  useEffect(() => {
    if (!open && goal?.id) {
      delete initialEntriesLoaded.current[goal.id];
    }
  }, [open, goal?.id]);

  useEffect(() => {
    if (!open || !goal?.id) return;
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [open, goal?.id]);

  const loadMonthEntries = useCallback(async (targetMonth = monthCursor) => {
    if (!goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;

    try {
      setMonthEntriesLoading(true);
      const entriesForMonth = await fetchGoalEntriesForMonth(goal.id, targetMonth);
      setMonthEntries(entriesForMonth || []);

      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      const monthsToLoad = [
        new Date(year, month - 1, 1),
        new Date(year, month, 1),
        new Date(year, month + 1, 1),
      ];
      const monthEntriesList = await Promise.all(
        monthsToLoad.map((monthDate) => fetchGoalEntriesForMonth(goal.id, monthDate))
      );
      const combinedEntries = [];
      const entryIds = new Set();
      monthEntriesList.flat().forEach((entry) => {
        if (!entry || entryIds.has(entry.id)) return;
        entryIds.add(entry.id);
        combinedEntries.push(entry);
      });
      setMonthEntriesPool(combinedEntries);
    } catch (err) {
      console.error('Failed to load month entries:', err);
    } finally {
      setMonthEntriesLoading(false);
    }
  }, [goal, fetchGoalEntriesForMonth, monthCursor]);

  const loadWeekEntriesPool = useCallback(async () => {
    if (!goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;
    if (goal.cadence !== 'week') {
      setWeekEntriesPool([]);
      return;
    }

    try {
      const year = monthCursor.getFullYear();
      const month = monthCursor.getMonth();
      const monthsToLoad = [
        new Date(year, month - 1, 1),
        new Date(year, month, 1),
        new Date(year, month + 1, 1),
      ];

      const monthEntriesList = await Promise.all(
        monthsToLoad.map((monthDate) => fetchGoalEntriesForMonth(goal.id, monthDate))
      );

      const combinedEntries = [];
      const entryIds = new Set();
      monthEntriesList.flat().forEach((entry) => {
        if (!entry || entryIds.has(entry.id)) return;
        entryIds.add(entry.id);
        combinedEntries.push(entry);
      });

      setWeekEntriesPool(combinedEntries);
    } catch (err) {
      console.error('Failed to load week entries pool:', err);
    }
  }, [goal, fetchGoalEntriesForMonth, monthCursor]);

  const loadAllEntries = useCallback(async () => {
    if (!goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;
    if (goal.cadence !== 'day' && goal.cadence !== 'week' && goal.cadence !== 'month') {
      setAllEntries([]);
      return;
    }

    try {
      const entries = await fetchGoalEntriesAll(goal.id);
      setAllEntries(entries || []);
    } catch (err) {
      console.error('Failed to load all entries:', err);
    }
  }, [goal, fetchGoalEntriesAll]);

  useEffect(() => {
    if (!open || !goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;

    loadMonthEntries();
    loadWeekEntriesPool();
    loadAllEntries();
  }, [open, goal, monthCursor, loadMonthEntries, loadWeekEntriesPool, loadAllEntries]);

  const getCompletionLabel = (goalItem, detail = null) => {
    const baseLabel = goalItem?.title || 'this goal';
    if (detail) {
      return `${baseLabel}: ${detail}`;
    }
    return baseLabel;
  };

  const openShareDialog = (goalItem, detail = null) => {
    setShareDialog({ open: true, goal: goalItem, label: getCompletionLabel(goalItem, detail) });
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
      const streakValue = getGoalStreakValue(shareDialog.goal, allEntries);
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

  const checkGoalProgressCompletion = async (goalItem) => {
    if (!user || !goalItem) return;
    const wasCompleted = !!goalItem.progress?.completed;
    try {
      const progress = await getGoalProgress(user.uid, goalItem.id);
      if (progress?.completed && !wasCompleted) {
        openShareDialog(goalItem);
      }
    } catch (err) {
      console.error('Failed to check goal progress:', err);
    }
  };

  const isHabitOrMetric = goal?.type === 'habit' || goal?.type === 'metric';
  const isGoalPaused = Boolean(goal?.isPaused && isHabitOrMetric);

  const handleEditEntry = (entry) => {
    if (isGoalPaused) return;
    setEntryDialog({ open: true, entry, saving: false, error: null, initialDate: null });
  };

  const getEntryForDate = useCallback((dateValue) => {
    if (!dateValue || !monthEntriesPool.length) return null;
    const dateKey = formatLocalDate(dateValue);
    return monthEntriesPool.find(entry => {
      const entryDate = new Date(entry.occurred_at || entry.occurredAt || 0);
      if (Number.isNaN(entryDate.getTime())) return false;
      return formatLocalDate(entryDate) === dateKey;
    }) || null;
  }, [monthEntriesPool]);

  const handleDayEntry = (dateValue) => {
    if (isGoalPaused) return;
    const entryForDay = getEntryForDate(dateValue);
    if (entryForDay) {
      handleDeleteEntry(entryForDay);
      return;
    }

    const now = new Date();
    const initialDate = new Date(dateValue);
    initialDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    setEntryDialog({ open: true, entry: null, saving: false, error: null, initialDate });
  };

  const handleDeleteEntry = async (entry) => {
    if (!user || isGoalPaused || !window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteEntry(goal.id, entry.id);
      await loadMonthEntries();
      await loadWeekEntriesPool();
      await loadAllEntries();
      if (isClubGoal) {
        refreshClubEntries();
      }
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleSaveEntry = async (entryData) => {
    if (!user || !goal || isGoalPaused) return;

    const isUpdate = !!entryDialog.entry;
    if (entryDialog.saving) return;

    setEntryDialog(prev => ({ ...prev, saving: true, error: null }));

    try {
      if (isUpdate) {
        await updateEntry(goal.id, entryDialog.entry.id, entryData);
      } else {
        await createEntry(goal.id, entryData);
        await checkGoalProgressCompletion(goal);
      }

      await loadMonthEntries();
      await loadWeekEntriesPool();
      await loadAllEntries();
      if (isClubGoal) {
        refreshClubEntries();
      }

      setEntryDialog({ open: false, entry: null, saving: false, error: null, initialDate: null });
    } catch (err) {
      setEntryDialog(prev => ({ 
        ...prev, 
        saving: false, 
        error: err.message || 'Failed to save entry'
      }));
    }
  };

  const handleAddMilestone = async () => {
    if (!user || !goal) return;
    const title = newMilestoneTitle.trim();
    if (!title) return;

    try {
      setAddingMilestone(true);
      const nextOrder = (goal.milestones || []).length;
      await createMilestone(goal.id, {
        title,
        order: nextOrder,
        done: false,
      });
      setNewMilestoneTitle('');
    } catch (err) {
      console.error('Failed to add milestone:', err);
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!user || !goal || !milestoneId) return;

    const normalizedId = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;

    try {
      setDeletingMilestones(prev => ({ ...prev, [normalizedId]: true }));
      await deleteMilestone(goal.id, normalizedId);
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    } finally {
      setDeletingMilestones(prev => {
        const next = { ...prev };
        delete next[normalizedId];
        return next;
      });
    }
  };

  const handleOpenMilestoneDate = (milestone) => {
    if (!milestone) return;
    const currentDate = milestone.doneAt ? new Date(milestone.doneAt) : new Date();
    setMilestoneDateDialog({
      open: true,
      milestoneId: milestone.id,
      value: currentDate,
      saving: false,
    });
  };

  const handleSaveMilestoneDate = async () => {
    if (!user || !goal || !milestoneDateDialog.milestoneId || !milestoneDateDialog.value) return;

    try {
      setMilestoneDateDialog(prev => ({ ...prev, saving: true }));
      await updateMilestone(goal.id, milestoneDateDialog.milestoneId, {
        done: true,
        doneAt: milestoneDateDialog.value.toISOString(),
      });
      setMilestoneDateDialog({
        open: false,
        milestoneId: null,
        value: null,
        saving: false,
      });
    } catch (err) {
      console.error('Failed to update milestone date:', err);
      setMilestoneDateDialog(prev => ({ ...prev, saving: false }));
    }
  };

  const handleToggleMilestone = async (milestone) => {
    if (!user || !goal) return;

    const milestoneId = milestone.id || milestone.ID;
    const milestoneIdNum = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
    
    // Prevent multiple clicks
    if (updatingMilestones[milestoneIdNum]) {
      return;
    }

    const newDoneState = !milestone.done;
    const remainingIncomplete = (goal.milestones || []).filter(m => !m.done);
    const isLastIncomplete = newDoneState && remainingIncomplete.length === 1;

    try {
      setUpdatingMilestones(prev => ({ ...prev, [milestoneIdNum]: true }));
      await updateMilestone(goal.id, milestoneIdNum, { 
        done: newDoneState,
        doneAt: newDoneState ? new Date().toISOString() : null
      });
      if (isLastIncomplete) {
        openShareDialog(goal);
      }
    } catch (err) {
      console.error('Failed to update milestone:', err);
    } finally {
      setUpdatingMilestones(prev => {
        const next = { ...prev };
        delete next[milestoneIdNum];
        return next;
      });
    }
  };

  const handleDragStart = (e, milestoneId) => {
    setDraggedMilestoneId(milestoneId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', milestoneId);
  };

  const handleDragOver = (e, milestoneId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (milestoneId !== draggedOverMilestoneId) {
      setDraggedOverMilestoneId(milestoneId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverMilestoneId(null);
  };

  const handleDrop = async (e, targetMilestoneId) => {
    e.preventDefault();
    setDraggedOverMilestoneId(null);

    if (!draggedMilestoneId || draggedMilestoneId === targetMilestoneId) {
      setDraggedMilestoneId(null);
      return;
    }

    if (!user || !goal) {
      setDraggedMilestoneId(null);
      return;
    }

    try {
      // Get sorted milestones by order
      const sortedMilestones = [...(goal.milestones || [])].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : (a.id || 0);
        const orderB = b.order !== undefined ? b.order : (b.id || 0);
        return orderA - orderB;
      });

      const draggedIndex = sortedMilestones.findIndex(m => m.id === draggedMilestoneId);
      const targetIndex = sortedMilestones.findIndex(m => m.id === targetMilestoneId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedMilestoneId(null);
        return;
      }

      // Reorder milestones array
      const reorderedMilestones = [...sortedMilestones];
      const [draggedMilestone] = reorderedMilestones.splice(draggedIndex, 1);
      reorderedMilestones.splice(targetIndex, 0, draggedMilestone);

      // Update order for all milestones
      const updatedMilestones = reorderedMilestones.map((milestone, index) => ({
        ...milestone,
        order: index,
      }));

      // Use bulk update to update all milestones at once
      await bulkUpdateMilestones(goal.id, updatedMilestones);
    } catch (err) {
      console.error('Failed to reorder milestones:', err);
    } finally {
      setDraggedMilestoneId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedMilestoneId(null);
    setDraggedOverMilestoneId(null);
  };

  const handleToggleOneTimeGoal = async () => {
    if (!user || !goal || goal.type !== 'one_time') return;

    const newCompleted = !goal.completed;

    try {
      await updateGoal(goal.id, {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  const handleDeleteGoal = () => {
    if (!goal) return;
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!user || !goal) return;

    try {
      await deleteGoal(goal.id);
      setDeleteConfirmOpen(false);
      onClose();
    } catch (err) {
      console.error('Failed to delete goal:', err);
      setDeleteConfirmOpen(false);
    }
  };

  const handleConfirmPause = async () => {
    if (!user || !goal || pauseResumeLoading) return;
    try {
      setPauseResumeLoading(true);
      await pauseGoal(goal.id);
      setPauseConfirmOpen(false);
    } catch (err) {
      console.error('Failed to pause goal:', err);
    } finally {
      setPauseResumeLoading(false);
    }
  };

  const handleResumeFromModal = async () => {
    if (!user || !goal || pauseResumeLoading) return;
    try {
      setPauseResumeLoading(true);
      await resumeGoal(goal.id);
    } catch (err) {
      console.error('Failed to resume goal:', err);
    } finally {
      setPauseResumeLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const progress = goal?.progress;
  const hasProgress = progress && (goal?.type === 'habit' || goal?.type === 'metric');

  const { data: clubProgressData, isLoading: clubProgressLoading } = useQuery({
    queryKey: ['clubGoalProgress', 'modal', clubGoalId, currentClub?.id, user?.uid],
    queryFn: () => getClubGoalProgressReport(clubGoalId, currentClub.id, user.uid),
    enabled:
      open &&
      isClubGoal &&
      Boolean(clubGoalId) &&
      Boolean(currentClub?.id) &&
      Boolean(user?.uid),
  });

  const clubGoalForSummary = clubProgressData?.clubGoal;
  const clubSnapshot = clubProgressData?.aggregate;

  const userTodayActualClub = useMemo(() => {
    if (!goal || goal.type !== 'metric') return 0;
    const todayEntries = getTodayEntries(goal.entries || []);
    return todayEntries.reduce((s, e) => s + (parseFloat(e.quantity) || 0), 0);
  }, [goal]);

  const targetValue = useMemo(() => getGoalTargetValue(goal), [goal]);

  const getPercentForEntries = useCallback((entriesForPeriod) => {
    if (!goal || !entriesForPeriod) return null;
    if (goal.cadence !== 'week' && goal.cadence !== 'month') return null;

    const actual = goal.measure === 'sum'
      ? entriesForPeriod.reduce((acc, entry) => acc + (parseFloat(entry.quantity) || 0), 0)
      : entriesForPeriod.length;
    if (!targetValue) return 0;
    return Math.round(Math.min((actual / targetValue) * 100, 100));
  }, [goal, targetValue]);

  const weeklyProgressByRow = useMemo(() => {
    if (goal?.cadence !== 'week') return null;
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    return Array.from({ length: 5 }, (_, rowIndex) => {
      const anchorDate = new Date(year, month, 1 - firstDayOfMonth + (rowIndex * 7));
      const { start, end } = getPeriodBoundaries('week', anchorDate);
      const entriesForWeek = (weekEntriesPool || []).filter(entry => {
        const entryDate = new Date(entry.occurred_at || entry.occurredAt || 0);
        return entryDate >= start && entryDate < end;
      });

      return getPercentForEntries(entriesForWeek);
    });
  }, [goal?.cadence, monthCursor, weekEntriesPool, getPercentForEntries]);

  const monthProgressPercent = useMemo(() => (
    goal?.cadence === 'month' ? getPercentForEntries(monthEntries) : null
  ), [goal?.cadence, getPercentForEntries, monthEntries]);

  const pausedDateKeys = useMemo(() => {
    const set = new Set();
    const pauses = goal?.goalPauses;
    if (!pauses?.length || !monthCursor) return set;
    const normalized = pauses.map((p) => ({
      pausedAt: p.pausedAt || p.paused_at,
      resumedAt: p.resumedAt ?? p.resumed_at ?? null,
    }));
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const now = new Date();
    for (let d = 1; d <= dim; d += 1) {
      const dayStart = new Date(y, m, d, 0, 0, 0, 0);
      const dayEnd = new Date(y, m, d + 1, 0, 0, 0, 0);
      if (isGoalPauseCoveringPeriod(dayStart, dayEnd, normalized, now)) {
        set.add(formatLocalDate(dayStart));
      }
    }
    return set;
  }, [goal?.goalPauses, monthCursor]);

  const streakSummary = useMemo(() => (
    getGoalStreakSummary(goal, allEntries)
  ), [goal, allEntries]);

  const handlePrevMonth = () => {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (!goal) return null;

  return (
    <>
      <FullscreenDialog
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
            <Typography variant="h5" component="div" sx={{ minWidth: 0 }}>
              {goal.title}
            </Typography>
            {isClubGoal && <ClubGoalChip />}
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ overflowX: 'hidden' }}>
          <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', minWidth: 0 }}>
            {/* Goal Info */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                <Chip
                  label={goal.type === 'habit' ? 'Habit' : goal.type === 'metric' ? 'Metric' : goal.type === 'milestone' ? 'Milestone' : 'One-Time'}
                  color="primary"
                  size="small"
                />
                {goal.cadence && (
                  <Typography variant="body2" color="text.secondary">
                    {goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)}
                  </Typography>
                )}
                {isGoalPaused && <PausedGoalChip />}
                {isGoalPaused && goal.pausedAt && (
                  <Typography variant="caption" color="text.secondary">
                    Paused since {formatPauseStartForDisplay(goal.pausedAt)}
                  </Typography>
                )}
              </Box>
              {isGoalPaused && (goal.type === 'habit' || goal.type === 'metric') && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Entries are disabled while this goal is paused. Resume to log progress again.
                </Typography>
              )}

              {/* Club rollup or personal progress */}
              {isClubGoal && clubProgressLoading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2, mb: 2 }}>
                  <CircularProgress size={28} />
                </Box>
              )}
              {isClubGoal && clubGoalForSummary && clubSnapshot && !clubProgressLoading && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="overline" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    Club progress
                  </Typography>
                  <ClubGoalDashboardSummary
                    clubGoal={clubGoalForSummary}
                    snapshot={clubSnapshot}
                    userId={user?.uid}
                    clubId={currentClub?.id}
                    userTodayActual={userTodayActualClub}
                    personalActual={progress?.actual ?? 0}
                    personalTarget={targetValue}
                    showTitle={false}
                    collapsed={false}
                  />
                </Box>
              )}
              {!isClubGoal && hasProgress && (
                <Box sx={{ mb: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <Typography variant="body1" sx={{ flex: '1 1 auto', minWidth: 0 }}>
                      {getProgressText(goal, progress)}
                    </Typography>
                    <Chip
                      label={progress.completed ? 'Completed' : 'In Progress'}
                      color={progress.completed ? 'success' : 'default'}
                      size="small"
                      sx={{ flexShrink: 0 }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressBarValue(goal)}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              )}

              {/* Milestones for milestone goals */}
              {goal.type === 'milestone' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Milestones
                  </Typography>
                  {(!goal.milestones || goal.milestones.length === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      No milestones defined
                    </Typography>
                  ) : (
                    [...(goal.milestones || [])]
                      .sort((a, b) => {
                        const orderA = a.order !== undefined ? a.order : (a.id || 0);
                        const orderB = b.order !== undefined ? b.order : (b.id || 0);
                        return orderA - orderB;
                      })
                      .map((milestone) => {
                        if (!milestone || !milestone.id) return null;
                        
                        const isDragging = draggedMilestoneId === milestone.id;
                        const isDraggedOver = draggedOverMilestoneId === milestone.id;
                        
                        return (
                          <Box
                            key={milestone.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, milestone.id)}
                            onDragOver={(e) => handleDragOver(e, milestone.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, milestone.id)}
                            onDragEnd={handleDragEnd}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1,
                              p: 1,
                              borderRadius: 1,
                              cursor: 'move',
                              opacity: isDragging ? 0.5 : 1,
                              backgroundColor: isDraggedOver ? 'action.hover' : 'transparent',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                          >
                            <DragIndicator
                              sx={{
                                color: 'text.secondary',
                                cursor: 'grab',
                                '&:active': {
                                  cursor: 'grabbing',
                                },
                              }}
                            />
                            <Checkbox
                              checked={milestone.done || false}
                              onChange={() => handleToggleMilestone(milestone)}
                              disabled={!milestone.id || updatingMilestones[milestone.id]}
                              size="small"
                            />
                            {updatingMilestones[milestone.id] && (
                              <CircularProgress size={16} sx={{ ml: 1 }} />
                            )}
                            <Typography
                              variant="body2"
                              sx={{
                                textDecoration: milestone.done ? 'line-through' : 'none',
                                opacity: milestone.done ? 0.6 : 1,
                                flex: 1,
                              }}
                            >
                              {milestone.title || 'Untitled milestone'}
                            </Typography>
                            {milestone.doneAt && (
                              <Typography variant="caption" color="text.secondary">
                                {formatDate(milestone.doneAt)}
                              </Typography>
                            )}
                            {milestone.done && (
                              <IconButton
                                size="small"
                                onClick={() => handleOpenMilestoneDate(milestone)}
                                color="primary"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMilestone(milestone.id)}
                              color="error"
                              disabled={deletingMilestones[milestone.id]}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                            {deletingMilestones[milestone.id] && (
                              <CircularProgress size={16} />
                            )}
                          </Box>
                        );
                      })
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <TextField
                      label="New milestone"
                      size="small"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMilestone();
                        }
                      }}
                      fullWidth
                      disabled={addingMilestone}
                    />
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddMilestone}
                      disabled={!newMilestoneTitle.trim() || addingMilestone}
                    >
                      {addingMilestone ? 'Adding...' : 'Add'}
                    </Button>
                  </Box>
                </Box>
              )}

              {/* One-time goal completion */}
              {goal.type === 'one_time' && (
                <Box sx={{ mt: 2 }}>
                  <Button
                    fullWidth
                    variant={goal.completed ? 'outlined' : 'contained'}
                    color={goal.completed ? 'success' : 'primary'}
                    size="large"
                    startIcon={goal.completed ? <Check /> : null}
                    onClick={handleToggleOneTimeGoal}
                    sx={{ py: 1.5, fontWeight: 600 }}
                  >
                    {goal.completed ? 'Completed — tap to undo' : 'Mark as complete'}
                  </Button>
                  {goal.completed && goal.completedAt && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', textAlign: 'center', mt: 1 }}
                    >
                      Completed {formatDate(goal.completedAt)}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>

            {isClubGoal && clubGoalId && (
              <ClubGoalMembersAccordion
                clubGoalId={clubGoalId}
                clubId={currentClub?.id}
                userId={user?.uid}
                enabled={open}
              />
            )}

            {/* Entries Section (for habit/metric goals) */}
            {(goal.type === 'habit' || goal.type === 'metric') && (
              <>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1.5, textAlign: 'center' }}
                >
                  {isClubGoal
                    ? 'Your entries — tap a date to add or remove'
                    : 'Tap a date to add or remove an entry'}
                </Typography>

                <MonthlyStreakGrid
                  entries={monthEntriesPool}
                  monthDate={monthCursor}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onDayClick={isGoalPaused ? null : handleDayEntry}
                  cadence={goal.cadence}
                  progressPercent={monthProgressPercent}
                  weeklyProgressByRow={weeklyProgressByRow}
                  streakSummary={streakSummary}
                  pausedDateKeys={pausedDateKeys}
                  isGoalPaused={isGoalPaused}
                />

                <Accordion
                  defaultExpanded={false}
                  sx={{ boxShadow: 1, width: '100%', minWidth: 0, overflow: 'hidden' }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMore />}
                    sx={{ '& .MuiAccordionSummary-content': { minWidth: 0 } }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="h6">Entry History</Typography>
                      {isClubGoal && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          All club members&apos; entries
                        </Typography>
                      )}
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ minWidth: 0, overflow: 'hidden', px: { xs: 1, sm: 2 } }}>
                    {(isClubGoal ? clubEntriesLoading : monthEntriesLoading) &&
                    displayEntries.length === 0 ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : displayEntries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                        No entries yet
                      </Typography>
                    ) : (
                      <>
                        <TableContainer sx={{ width: '100%', overflowX: 'auto' }}>
                          <Table size="small" sx={{ minWidth: isClubGoal ? 520 : 360 }}>
                            <TableHead>
                              <TableRow>
                                {isClubGoal && <TableCell>Member</TableCell>}
                                {goal.type === 'metric' && (
                                  <TableCell sx={{ minWidth: 120 }}>Quantity</TableCell>
                                )}
                                <TableCell>Date & Time</TableCell>
                                <TableCell align="right">Actions</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {displayEntries.map((entry) => {
                                const entryUserId = entry.userId ?? entry.user_id;
                                const canEditEntry =
                                  !isClubGoal || entryUserId === user?.uid;
                                return (
                                  <TableRow key={entry.id}>
                                    {isClubGoal && (
                                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                        {entry.user?.displayName || 'Member'}
                                      </TableCell>
                                    )}
                                    {goal.type === 'metric' && (
                                      <TableCell sx={{ minWidth: 120, whiteSpace: 'nowrap' }}>
                                        <Chip
                                          label={`${parseFloat(entry.quantity || 0).toFixed(1)} ${goal.unit || ''}`}
                                          size="small"
                                          variant="outlined"
                                        />
                                      </TableCell>
                                    )}
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                                      {formatDateTime(entry.occurred_at || entry.occurredAt)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                                      {canEditEntry ? (
                                        <>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleEditEntry(entry)}
                                            color="primary"
                                            disabled={isGoalPaused}
                                          >
                                            <Edit fontSize="small" />
                                          </IconButton>
                                          <IconButton
                                            size="small"
                                            onClick={() => handleDeleteEntry(entry)}
                                            color="error"
                                            disabled={isGoalPaused}
                                          >
                                            <Delete fontSize="small" />
                                          </IconButton>
                                        </>
                                      ) : (
                                        <Typography variant="caption" color="text.secondary">
                                          —
                                        </Typography>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Box ref={observerTarget} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                          {(isClubGoal ? clubEntriesLoadingMore : loadingMore) && (
                            <CircularProgress size={24} />
                          )}
                          {!hasMore && displayEntries.length > 0 && (
                            <Typography variant="body2" color="text.secondary">
                              No more entries
                            </Typography>
                          )}
                        </Box>
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>
              </>
            )}

            {isClubGoal && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', textAlign: 'center', mt: 3, mb: 1 }}
              >
                This goal is managed by your club. Contact an admin to change or remove it.
              </Typography>
            )}
          </Box>
        </DialogContent>
        {!isClubGoal && (
          <DialogActions sx={{ justifyContent: 'flex-start', px: 3, pb: 3, flexWrap: 'wrap', gap: 1 }}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button onClick={handleDeleteGoal} color="error">
                Delete Goal
              </Button>
              {isHabitOrMetric && !isGoalPaused && (
                <Button
                  onClick={() => setPauseConfirmOpen(true)}
                  color="warning"
                  variant="outlined"
                >
                  Pause goal
                </Button>
              )}
              {isHabitOrMetric && isGoalPaused && (
                <Button
                  onClick={handleResumeFromModal}
                  color="success"
                  variant="contained"
                  disabled={pauseResumeLoading}
                >
                  {pauseResumeLoading ? 'Resuming…' : 'Resume goal'}
                </Button>
              )}
            </Box>
          </DialogActions>
        )}
      </FullscreenDialog>

      <GoalEntryDialog
        open={entryDialog.open}
        onClose={() => setEntryDialog({ open: false, entry: null, saving: false, error: null, initialDate: null })}
        onSave={handleSaveEntry}
        goal={goal}
        entry={entryDialog.entry}
        initialDate={entryDialog.initialDate}
        saving={entryDialog.saving}
        error={entryDialog.error}
      />

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Dialog
          open={milestoneDateDialog.open}
          onClose={() => setMilestoneDateDialog({ open: false, milestoneId: null, value: null, saving: false })}
        >
          <DialogTitle>Edit Completion Date</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <DateTimePicker
              label="Completion date/time"
              value={milestoneDateDialog.value}
              onChange={(newValue) => setMilestoneDateDialog(prev => ({ ...prev, value: newValue }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMilestoneDateDialog({ open: false, milestoneId: null, value: null, saving: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMilestoneDate}
              variant="contained"
              disabled={!milestoneDateDialog.value || milestoneDateDialog.saving}
            >
              {milestoneDateDialog.saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>

      <GoalCompletionShareDialog
        open={shareDialog.open}
        onClose={closeShareDialog}
        onConfirm={handleShareConfirm}
        completionLabel={shareDialog.label}
      />
      <IOSConfirmDialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        title="Delete goal?"
        description="This will permanently delete the goal and its entries. This action cannot be undone."
        cancelLabel="Cancel"
        confirmLabel="Delete"
        destructive
        onConfirm={handleConfirmDelete}
      />
      <IOSConfirmDialog
        open={pauseConfirmOpen}
        onClose={() => !pauseResumeLoading && setPauseConfirmOpen(false)}
        title="Pause this goal?"
        description="While paused, this period won't count against you on leaderboards. You won't be able to add or edit entries until you resume."
        cancelLabel="Cancel"
        confirmLabel="Pause"
        confirmDisabled={pauseResumeLoading}
        onConfirm={handleConfirmPause}
      />
    </>
  );
};

export default GoalDetailsModal;

