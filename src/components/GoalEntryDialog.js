import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const GoalEntryDialog = ({ open, onClose, onSave, goal, entry = null }) => {
  const [formData, setFormData] = useState({
    occurred_at: new Date(),
    quantity: null,
  });

  useEffect(() => {
    if (entry) {
      setFormData({
        occurred_at: entry.occurred_at ? new Date(entry.occurred_at) : new Date(),
        quantity: entry.quantity || null,
      });
    } else {
      setFormData({
        occurred_at: new Date(),
        quantity: goal?.type === 'metric' ? 0 : null,
      });
    }
  }, [entry, goal, open]);

  const handleSave = () => {
    if (goal?.type === 'metric' && (!formData.quantity || formData.quantity <= 0)) {
      alert('Quantity must be greater than 0 for metric goals');
      return;
    }

    onSave({
      occurred_at: formData.occurred_at.toISOString(),
      quantity: goal?.type === 'metric' ? parseFloat(formData.quantity) : null,
    });
    onClose();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {entry ? 'Edit Entry' : 'Add Entry'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <DateTimePicker
              label="Date & Time"
              value={formData.occurred_at}
              onChange={(date) => setFormData(prev => ({ ...prev, occurred_at: date }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />

            {goal?.type === 'metric' && (
              <TextField
                label={`Quantity (${goal.unit || 'units'})`}
                type="number"
                value={formData.quantity || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                fullWidth
                required
                inputProps={{ step: '0.1', min: 0 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {entry ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default GoalEntryDialog;

