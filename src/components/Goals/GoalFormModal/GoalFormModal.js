import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Chip,
  Grid,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const GoalFormModal = ({ open, onClose, onSave, onArchive, editingGoal = null }) => {
  // Note: onArchive is kept for backward compatibility but actually deletes the goal
  const [formData, setFormData] = useState({
    title: '',
    type: 'habit',
    measure: 'count',
    cadence: 'week',
    targetCount: null,
    targetQuantity: null,
    unit: '',
    dueAt: null,
    milestones: [],
    completed: false,
  });

  const [newMilestone, setNewMilestone] = useState({ title: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // Helper function to convert various date formats to Date object
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) {
      // Check if it's a valid date
      return isNaN(dateValue.getTime()) ? null : dateValue;
    }
    if (typeof dateValue === 'string') {
      const parsed = new Date(dateValue);
      // Check if it's a valid date
      return isNaN(parsed.getTime()) ? null : parsed;
    }
    const parsed = new Date(dateValue);
    // Check if it's a valid date
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  useEffect(() => {
    if (editingGoal) {
      // Sort milestones by order when loading
      const milestones = (editingGoal.milestones || []).slice().sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : (a.id || 0);
        const orderB = b.order !== undefined ? b.order : (b.id || 0);
        return orderA - orderB;
      });
      
      setFormData({
        title: editingGoal.title || '',
        type: editingGoal.type || 'habit',
        measure: editingGoal.measure || 'count',
        cadence: editingGoal.cadence || 'week',
        targetCount: editingGoal.targetCount || editingGoal.target_count || null,
        targetQuantity: editingGoal.targetQuantity || editingGoal.target_quantity || null,
        unit: editingGoal.unit || '',
        dueAt: parseDate(editingGoal.dueAt || editingGoal.due_at),
        milestones: milestones,
        completed: editingGoal.completed || false,
      });
    } else {
      setFormData({
        title: '',
        type: 'habit',
        measure: 'count',
        cadence: 'week',
        targetCount: null,
        targetQuantity: null,
        unit: '',
        dueAt: null,
        milestones: [],
        completed: false,
      });
    }
    if (!open) {
      setDeleteConfirmOpen(false);
    }
  }, [editingGoal, open]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddMilestone = () => {
    if (newMilestone.title.trim()) {
      setFormData(prev => ({
        ...prev,
        milestones: [...prev.milestones, { 
          title: newMilestone.title.trim(), 
          done: false,
          order: prev.milestones.length
        }]
      }));
      setNewMilestone({ title: '' });
    }
  };

  const handleRemoveMilestone = (index) => {
    setFormData(prev => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index)
    }));
  };

  const showSnackbar = (message, severity = 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleSave = () => {
    if (!formData.title.trim()) {
      showSnackbar('Goal title is required');
      return;
    }

    const goalData = {
      title: formData.title.trim(),
      type: formData.type,
    };

    // Add type-specific fields
    if (formData.type === 'habit') {
      goalData.measure = 'count';
      goalData.cadence = formData.cadence;
      goalData.targetCount = parseInt(formData.targetCount);
      if (!goalData.targetCount || !goalData.cadence) {
        showSnackbar('Habit goals require cadence and target count');
        return;
      }
    } else if (formData.type === 'metric') {
      goalData.measure = 'sum';
      goalData.cadence = formData.cadence;
      goalData.targetQuantity = parseFloat(formData.targetQuantity);
      goalData.unit = formData.unit.trim();
      if (!goalData.targetQuantity || !goalData.unit || !goalData.cadence) {
        showSnackbar('Metric goals require cadence, target quantity, and unit');
        return;
      }
    } else if (formData.type === 'milestone') {
      goalData.milestones = formData.milestones;
      if (goalData.milestones.length === 0) {
        showSnackbar('Milestone goals require at least one milestone');
        return;
      }
    } else if (formData.type === 'one_time') {
      goalData.dueAt = formData.dueAt ? formData.dueAt.toISOString() : null;
    }

    // Handle completion status for all goal types when editing
    if (editingGoal) {
      goalData.completed = formData.completed;
      if (formData.completed && !editingGoal.completed) {
        // If marking as completed, set completedAt
        goalData.completedAt = new Date().toISOString();
      } else if (!formData.completed && editingGoal.completed) {
        // If uncompleting, clear completedAt
        goalData.completedAt = null;
      }
    }

    onSave(goalData);
    onClose();
  };

  const handleDelete = () => {
    if (editingGoal) {
      setDeleteConfirmOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    if (editingGoal) {
      onArchive(editingGoal.id);
    }
    setDeleteConfirmOpen(false);
    onClose();
  };

  const renderTypeFields = () => {
    switch (formData.type) {
      case 'habit':
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Cadence</InputLabel>
                <Select
                  value={formData.cadence}
                  onChange={(e) => handleInputChange('cadence', e.target.value)}
                  label="Cadence"
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                  <MenuItem value="quarter">Quarter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Target Count"
                type="number"
                value={formData.targetCount || ''}
                onChange={(e) => handleInputChange('targetCount', e.target.value)}
                fullWidth
                required
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        );

      case 'metric':
        return (
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Cadence</InputLabel>
                <Select
                  value={formData.cadence}
                  onChange={(e) => handleInputChange('cadence', e.target.value)}
                  label="Cadence"
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                  <MenuItem value="quarter">Quarter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Target Quantity"
                type="number"
                value={formData.targetQuantity || ''}
                onChange={(e) => handleInputChange('targetQuantity', e.target.value)}
                fullWidth
                required
                inputProps={{ step: '0.1', min: 0 }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Unit"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                fullWidth
                required
                placeholder="e.g., miles, hours"
              />
            </Grid>
          </Grid>
        );

      case 'milestone':
        return (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Milestones
            </Typography>
            {formData.milestones.map((milestone, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={`${index + 1}. ${milestone.title}`}
                  variant="outlined"
                  onDelete={() => handleRemoveMilestone(index)}
                  deleteIcon={<DeleteIcon />}
                />
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
              <TextField
                label="Milestone Title"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                size="small"
                sx={{ flexGrow: 1 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddMilestone();
                  }
                }}
              />
              <IconButton onClick={handleAddMilestone} color="primary">
                <AddIcon />
              </IconButton>
            </Box>
          </Box>
        );

      case 'one_time':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <DatePicker
              label="Due Date (Optional)"
              value={formData.dueAt}
              onChange={(date) => handleInputChange('dueAt', date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />
            {editingGoal && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.completed || false}
                    onChange={(e) => handleInputChange('completed', e.target.checked)}
                  />
                }
                label="Mark as completed"
              />
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGoal ? 'Edit Goal' : 'Create New Goal'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Goal Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Goal Type</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  // Reset type-specific fields when changing type
                  handleInputChange('type', newType);
                  if (newType === 'habit') {
                    handleInputChange('measure', 'count');
                  } else if (newType === 'metric') {
                    handleInputChange('measure', 'sum');
                  }
                }}
                label="Goal Type"
              >
                <MenuItem value="habit">Habit</MenuItem>
                <MenuItem value="metric">Metric</MenuItem>
                <MenuItem value="milestone">Milestone</MenuItem>
                <MenuItem value="one_time">One-time</MenuItem>
              </Select>
            </FormControl>

            {renderTypeFields()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          {editingGoal && (
            <Button onClick={handleDelete} color="error">
              Delete Goal
            </Button>
          )}
          <Button onClick={handleSave} variant="contained" disabled={!formData.title.trim()}>
            {editingGoal ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
        <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
          <DialogTitle>Delete goal?</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              This will permanently delete the goal and its entries. This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Dialog>
    </LocalizationProvider>
  );
};

export default GoalFormModal;
