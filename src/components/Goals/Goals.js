import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { Edit, Add, ChevronRight } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import useGoalsContext from 'contexts/Goals';
import GoalFormModal from 'components/Goals/GoalFormModal';
import TodaysGoals from 'components/QuickGoalCompletion';
import GoalDetailsModal from 'components/Goals/GoalDetailsModal';
import PersonalGoalsReport from 'components/PersonalGoalsReport';
import Layout from 'components/Layout';
import { 
  getGoalTypeLabel,
  getGoalTypeColor,
  getProgressInfo,
  getProgressBarValue,
} from 'utils/goalHelpers';

const Goals = () => {
  const { user } = useAuth();
  const { goals, loading, error, addGoal, updateGoal, deleteGoal } = useGoalsContext();
  const [localError, setLocalError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  const handleGoalClick = (goal) => {
    setSelectedGoal(goal);
    setDetailsModalOpen(true);
  };

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setModalOpen(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setModalOpen(true);
  };

  const handleSaveGoal = async (goalData) => {
    if (!user) return;

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
      } else {
        await addGoal(goalData);
      }
      setModalOpen(false);
    } catch (err) {
      setLocalError('Failed to save goal');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!user || !window.confirm('Are you sure you want to delete this goal?')) return;

    try {
      await deleteGoal(goalId);
    } catch (err) {
      setLocalError('Failed to delete goal');
    }
  };



  // Calculate consistency rate for a habit goal based on current period
  const calculateHabitConsistencyRate = (goal) => {
    if (goal.type !== 'habit' || !goal.cadence || !goal.progress) {
      return null;
    }
    
    // Use progress data if available
    // For habits, progress.completed indicates current period completion
    // We'll use a simple approach: if completed, 100%, otherwise use progress percentage
    if (goal.progress.completed) {
      return 100;
    }
    
    // If we have actual/target, calculate percentage
    if (goal.progress.actual !== undefined && goal.progress.target !== undefined && goal.progress.target > 0) {
      return (goal.progress.actual / goal.progress.target) * 100;
    }
    
    // Fallback: use 0 if no progress data
    return 0;
  };

  const filteredGoals = goals.filter(goal => {
    if (showCompleted) return true;
    return !goal.completed;
  }).sort((a, b) => {
    // Sort habits by consistency rate (auto-calculated), other goals by creation date
    if (a.type === 'habit' && b.type === 'habit') {
      const consistencyA = calculateHabitConsistencyRate(a) || 0;
      const consistencyB = calculateHabitConsistencyRate(b) || 0;
      
      if (consistencyB !== consistencyA) {
        return consistencyB - consistencyA; // Descending
      }
      
      // Tie-breaking: sort by creation date (oldest first)
      const dateA = new Date(a.created_at || a.createdAt || 0);
      const dateB = new Date(b.created_at || b.createdAt || 0);
      return dateA - dateB;
    }
    // For non-habits or mixed types, keep original order
    return 0;
  });


  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Goals</Typography>
          {currentTab === 0 && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={handleCreateGoal}
            >
              Create Goal
            </Button>
          )}
        </Box>

        <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)} sx={{ mb: 3 }}>
          <Tab label="Goals" />
          <Tab label="Goals Report" />
        </Tabs>

        {currentTab === 1 && (
          <PersonalGoalsReport />
        )}

        {currentTab === 0 && (
          <>

        <Box sx={{ mb: 3 }}>
          <TodaysGoals />
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
            }
            label="Show completed goals"
          />
        </Box>

        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
            {error || localError}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGoals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      {showCompleted ? 'No completed goals' : 'No active goals. Create your first goal!'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGoals.map((goal) => {
                  const progress = goal.progress;
                  const hasProgress = progress && (goal.type === 'habit' || goal.type === 'metric');

                  return (
                    <TableRow 
                      key={goal.id} 
                      sx={{ 
                        opacity: goal.completed ? 0.6 : 1,
                        cursor: 'pointer',
                        '&:hover': {
                          backgroundColor: 'action.hover',
                        },
                      }}
                      onClick={() => handleGoalClick(goal)}
                    >
                      <TableCell>
                        <ChevronRight sx={{ color: 'text.secondary' }} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="subtitle1" sx={{ fontWeight: goal.completed ? 'normal' : 'bold' }}>
                          {goal.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getGoalTypeLabel(goal)}
                          color={getGoalTypeColor(goal.type)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {getProgressInfo(goal)}
                        </Typography>
                        {hasProgress && (
                          <LinearProgress
                            variant="determinate"
                            value={getProgressBarValue(goal)}
                            sx={{ height: 4, borderRadius: 1, mt: 0.5 }}
                            color={progress.completed ? 'success' : 'primary'}
                          />
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          onClick={() => handleEditGoal(goal)}
                          size="small"
                          color="primary"
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <GoalFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveGoal}
          onArchive={handleDeleteGoal}
          editingGoal={editingGoal}
        />

        <GoalDetailsModal
          open={detailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false);
            setSelectedGoal(null);
          }}
          goal={selectedGoal}
        />
          </>
        )}
      </Box>
    </Layout>
  );
};

export default Goals;
