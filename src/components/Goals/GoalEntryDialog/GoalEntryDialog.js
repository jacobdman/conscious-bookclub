import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const GoalEntryDialog = ({ open, onClose, onSave, goal, entry = null, saving = false, error = null }) => {
  const [formData, setFormData] = useState({
    occurred_at: new Date(),
    quantity: null,
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '' });

  useEffect(() => {
    if (open) {
      if (entry) {
        // Handle both occurred_at and occurredAt field names
        const occurredAt = entry.occurred_at || entry.occurredAt;
        setFormData({
          occurred_at: occurredAt ? new Date(occurredAt) : new Date(),
          quantity: entry.quantity || null,
        });
      } else {
        setFormData({
          occurred_at: new Date(),
          quantity: goal?.type === 'metric' ? 0 : null,
        });
      }
    }
  }, [entry, goal, open]);

  // Show snackbar when error prop changes
  useEffect(() => {
    if (error) {
      setSnackbar({ open: true, message: error });
    }
  }, [error]);

  const handleCloseSnackbar = () => {
    setSnackbar({ open: false, message: '' });
  };

  const handleSave = () => {
    if (goal?.type === 'metric' && (!formData.quantity || formData.quantity <= 0)) {
      setSnackbar({ open: true, message: 'Quantity must be greater than 0 for metric goals' });
      return;
    }

    onSave({
      occurred_at: formData.occurred_at.toISOString(),
      quantity: goal?.type === 'metric' ? parseFloat(formData.quantity) : null,
    });
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
                disabled={saving}
                inputProps={{ step: '0.1', min: 0 }}
                error={error !== null}
                helperText={error || ''}
              />
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {error}
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {entry ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              entry ? 'Update' : 'Add'
            )}
          </Button>
        </DialogActions>
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Dialog>
    </LocalizationProvider>
  );
};

export default GoalEntryDialog;

