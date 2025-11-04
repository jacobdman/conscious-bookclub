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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const GoalFormModal = ({ open, onClose, onSave, onArchive, editingGoal = null }) => {
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
  });

  const [newMilestone, setNewMilestone] = useState({ title: '' });

  // Helper function to convert various date formats to Date object
  const parseDate = (dateValue) => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'string') return new Date(dateValue);
    return new Date(dateValue);
  };

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title || '',
        type: editingGoal.type || 'habit',
        measure: editingGoal.measure || 'count',
        cadence: editingGoal.cadence || 'week',
        targetCount: editingGoal.targetCount || editingGoal.target_count || null,
        targetQuantity: editingGoal.targetQuantity || editingGoal.target_quantity || null,
        unit: editingGoal.unit || '',
        dueAt: parseDate(editingGoal.dueAt || editingGoal.due_at),
        milestones: editingGoal.milestones || [],
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
      });
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
        milestones: [...prev.milestones, { title: newMilestone.title.trim(), done: false }]
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

  const handleSave = () => {
    if (!formData.title.trim()) return;

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
        alert('Habit goals require cadence and target count');
        return;
      }
    } else if (formData.type === 'metric') {
      goalData.measure = 'sum';
      goalData.cadence = formData.cadence;
      goalData.targetQuantity = parseFloat(formData.targetQuantity);
      goalData.unit = formData.unit.trim();
      if (!goalData.targetQuantity || !goalData.unit || !goalData.cadence) {
        alert('Metric goals require cadence, target quantity, and unit');
        return;
      }
    } else if (formData.type === 'milestone') {
      goalData.milestones = formData.milestones;
      if (goalData.milestones.length === 0) {
        alert('Milestone goals require at least one milestone');
        return;
      }
    } else if (formData.type === 'one_time') {
      goalData.dueAt = formData.dueAt ? formData.dueAt.toISOString() : null;
    }

    onSave(goalData);
    onClose();
  };

  const handleArchive = () => {
    if (editingGoal) {
      onArchive(editingGoal.id);
      onClose();
    }
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
            <Button onClick={handleArchive} color="error">
              Archive Goal
            </Button>
          )}
          <Button onClick={handleSave} variant="contained" disabled={!formData.title.trim()}>
            {editingGoal ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default GoalFormModal;
