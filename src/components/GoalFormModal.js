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
    description: '',
    trackingType: 'one-time',
    dueDate: null,
    milestones: [],
    startDate: null,
    endDate: null,
  });

  const [newMilestone, setNewMilestone] = useState({ title: '', dueDate: null });

  useEffect(() => {
    if (editingGoal) {
      setFormData({
        title: editingGoal.title || '',
        description: editingGoal.description || '',
        trackingType: editingGoal.trackingType || 'one-time',
        dueDate: editingGoal.dueDate ? new Date(editingGoal.dueDate.seconds * 1000) : null,
        milestones: editingGoal.milestones ? editingGoal.milestones.map(milestone => ({
          ...milestone,
          dueDate: milestone.dueDate ? 
            (milestone.dueDate.seconds ? new Date(milestone.dueDate.seconds * 1000) : milestone.dueDate) 
            : null
        })) : [],
        startDate: editingGoal.startDate ? new Date(editingGoal.startDate.seconds * 1000) : null,
        endDate: editingGoal.endDate ? new Date(editingGoal.endDate.seconds * 1000) : null,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        trackingType: 'one-time',
        dueDate: null,
        milestones: [],
        startDate: null,
        endDate: null,
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
    if (newMilestone.title.trim() && newMilestone.dueDate) {
      setFormData(prev => ({
        ...prev,
        milestones: [...prev.milestones, { ...newMilestone, completed: false }]
      }));
      setNewMilestone({ title: '', dueDate: null });
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
      description: formData.description.trim(),
      trackingType: formData.trackingType,
    };

    // Add type-specific fields
    if (formData.trackingType === 'one-time') {
      goalData.dueDate = formData.dueDate;
    } else if (formData.trackingType === 'milestones') {
      goalData.milestones = formData.milestones;
    } else if (formData.trackingType === 'daily' || formData.trackingType === 'weekly') {
      goalData.startDate = formData.startDate;
      goalData.endDate = formData.endDate;
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

  const renderTrackingTypeFields = () => {
    switch (formData.trackingType) {
      case 'one-time':
        return (
          <DatePicker
            label="Due Date"
            value={formData.dueDate}
            onChange={(date) => handleInputChange('dueDate', date)}
            renderInput={(params) => <TextField {...params} fullWidth />}
          />
        );

      case 'milestones':
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
                <Typography variant="caption" color="text.secondary">
                  Due: {milestone.dueDate ? 
                    (milestone.dueDate.seconds ? 
                      new Date(milestone.dueDate.seconds * 1000).toLocaleDateString() : 
                      milestone.dueDate.toLocaleDateString()
                    ) : 'No date'}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
              <TextField
                label="Milestone Title"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone(prev => ({ ...prev, title: e.target.value }))}
                size="small"
                sx={{ flexGrow: 1 }}
              />
              <DatePicker
                label="Due Date"
                value={newMilestone.dueDate}
                onChange={(date) => setNewMilestone(prev => ({ ...prev, dueDate: date }))}
                renderInput={(params) => <TextField {...params} size="small" sx={{ minWidth: 150 }} />}
              />
              <IconButton onClick={handleAddMilestone} color="primary">
                <AddIcon />
              </IconButton>
            </Box>
          </Box>
        );

      case 'daily':
      case 'weekly':
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <DatePicker
                label="Start Date"
                value={formData.startDate}
                onChange={(date) => handleInputChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="End Date (Optional)"
                value={formData.endDate}
                onChange={(date) => handleInputChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
          </Grid>
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

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />

            <FormControl fullWidth>
              <InputLabel>Tracking Type</InputLabel>
              <Select
                value={formData.trackingType}
                onChange={(e) => handleInputChange('trackingType', e.target.value)}
                label="Tracking Type"
              >
                <MenuItem value="one-time">One-time</MenuItem>
                <MenuItem value="milestones">Milestones</MenuItem>
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
              </Select>
            </FormControl>

            {renderTrackingTypeFields()}
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
