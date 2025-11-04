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
} from '@mui/material';
import { Edit, Add } from '@mui/icons-material';
import { useAuth } from '../AuthContext';
import { getGoals, addGoal, updateGoal, deleteGoal } from '../services/dataService';
import GoalFormModal from './GoalFormModal';
import QuickGoalCompletion from './QuickGoalCompletion';
import Layout from './Layout';

const Goals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const fetchGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const snapshot = await getGoals(user.uid);
      const goalsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGoals(goalsData);
    } catch (err) {
      setError('Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoals();
  }, [user, fetchGoals]);

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
        await updateGoal(user.uid, editingGoal.id, goalData);
      } else {
        await addGoal(user.uid, goalData);
      }
      fetchGoals();
    } catch (err) {
      setError('Failed to save goal');
    }
  };

  const handleArchiveGoal = async (goalId) => {
    if (!user || !window.confirm('Are you sure you want to archive this goal?')) return;

    try {
      await deleteGoal(user.uid, goalId);
      fetchGoals();
    } catch (err) {
      setError('Failed to archive goal');
    }
  };

  const getTrackingTypeLabel = (type) => {
    switch (type) {
      case 'one-time': return 'One-time';
      case 'milestones': return 'Milestones';
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      default: return type;
    }
  };

  const getTrackingTypeColor = (type) => {
    switch (type) {
      case 'one-time': return 'primary';
      case 'milestones': return 'secondary';
      case 'daily': return 'success';
      case 'weekly': return 'warning';
      default: return 'default';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    try {
      if (timestamp instanceof Date) return timestamp.toLocaleDateString();
      if (timestamp.seconds) return new Date(timestamp.seconds * 1000).toLocaleDateString();
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getProgressInfo = (goal) => {
    switch (goal.trackingType) {
      case 'one-time':
        return goal.completed ? 'Completed' : `Due: ${formatDate(goal.dueDate)}`;
      case 'milestones':
        const completedMilestones = goal.milestones?.filter(m => m.completed).length || 0;
        const totalMilestones = goal.milestones?.length || 0;
        return `${completedMilestones}/${totalMilestones} milestones`;
      case 'daily':
      case 'weekly':
        return `Started: ${formatDate(goal.startDate)}`;
      default:
        return 'No progress info';
    }
  };

  const filteredGoals = goals.filter(goal => {
    if (showArchived) return true;
    return !goal.completed;
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
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateGoal}
          >
            Create Goal
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <QuickGoalCompletion onGoalUpdate={fetchGoals} />
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
            }
            label="Show archived goals"
          />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGoals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography color="text.secondary">
                      {showArchived ? 'No archived goals' : 'No active goals. Create your first goal!'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGoals.map((goal) => (
                  <TableRow key={goal.id} sx={{ opacity: goal.completed ? 0.6 : 1 }}>
                    <TableCell>
                      <Typography variant="subtitle1" sx={{ fontWeight: goal.completed ? 'normal' : 'bold' }}>
                        {goal.title}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTrackingTypeLabel(goal.trackingType)}
                        color={getTrackingTypeColor(goal.trackingType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {getProgressInfo(goal)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleEditGoal(goal)}
                        size="small"
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <GoalFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveGoal}
          onArchive={handleArchiveGoal}
          editingGoal={editingGoal}
        />
      </Box>
    </Layout>
  );
};

export default Goals;
