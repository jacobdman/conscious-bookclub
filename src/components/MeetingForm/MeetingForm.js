import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { createMeeting, updateMeeting } from 'services/meetings/meetings.service';
import { getBooks } from 'services/books/books.service';

const MeetingForm = ({ open, onClose, onSave, editingMeeting = null }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [formData, setFormData] = useState({
    date: null,
    startTime: '',
    duration: 120, // Default to 2 hours (120 minutes)
    location: '',
    bookId: '',
    notes: '',
    notifyOneDayBefore: false,
    notifyOneWeekBefore: false,
  });
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const loadBooks = useCallback(async () => {
    try {
      setLoading(true);
      const clubBooks = await getBooks(currentClub.id);
      setBooks(clubBooks || []);
    } catch (err) {
      console.error('Error loading books:', err);
      setError('Failed to load books');
    } finally {
      setLoading(false);
    }
  }, [currentClub]);

  useEffect(() => {
    if (open && currentClub) {
      loadBooks();
      if (editingMeeting) {
        setFormData({
          date: editingMeeting.date ? new Date(editingMeeting.date) : null,
          startTime: editingMeeting.startTime || '',
          duration: editingMeeting.duration || 120,
          location: editingMeeting.location || '',
          bookId: editingMeeting.bookId || '',
          notes: editingMeeting.notes || '',
          notifyOneDayBefore: editingMeeting.notifyOneDayBefore || false,
          notifyOneWeekBefore: editingMeeting.notifyOneWeekBefore || false,
        });
      } else {
        // Use club defaults for new meetings
        const clubDefaults = currentClub.config || {};
        setFormData({
          date: null,
          startTime: '',
          duration: 120, // Default to 2 hours
          location: '',
          bookId: '',
          notes: '',
          notifyOneDayBefore: clubDefaults.defaultMeetingNotifyOneDayBefore || false,
          notifyOneWeekBefore: clubDefaults.defaultMeetingNotifyOneWeekBefore || false,
        });
      }
      setError(null);
    }
  }, [open, editingMeeting, currentClub, loadBooks]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.date) {
      setError('Date is required');
      return;
    }

    if (!user || !currentClub) {
      setError('User or club not available');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const meetingData = {
        date: formData.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        startTime: formData.startTime || null,
        duration: formData.duration || 120,
        location: formData.location || null,
        bookId: formData.bookId || null,
        notes: formData.notes || null,
        notifyOneDayBefore: formData.notifyOneDayBefore,
        notifyOneWeekBefore: formData.notifyOneWeekBefore,
      };

      if (editingMeeting) {
        await updateMeeting(user.uid, currentClub.id, editingMeeting.id, meetingData);
      } else {
        await createMeeting(user.uid, currentClub.id, meetingData);
      }

      if (onSave) {
        onSave();
      }
      onClose();
    } catch (err) {
      console.error('Error saving meeting:', err);
      setError(err.message || 'Failed to save meeting');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMeeting ? 'Edit Meeting' : 'Create New Meeting'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <DatePicker
              label="Meeting Date"
              value={formData.date}
              onChange={(date) => handleInputChange('date', date)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                },
              }}
            />

            <TextField
              label="Start Time (Optional)"
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange('startTime', e.target.value)}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Leave empty for all-day event"
            />

            {formData.startTime && (
              <TextField
                label="Duration (minutes)"
                type="number"
                value={formData.duration === undefined || formData.duration === null ? '' : formData.duration}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow any input while typing - no validation during typing
                  if (value === '') {
                    handleInputChange('duration', '');
                  } else {
                    const numValue = parseInt(value, 10);
                    // Accept any number, even if less than 15 (validation happens on blur)
                    if (!isNaN(numValue)) {
                      handleInputChange('duration', numValue);
                    } else {
                      // Store as string if not a valid number (allows partial input)
                      handleInputChange('duration', value);
                    }
                  }
                }}
                onBlur={(e) => {
                  const value = formData.duration;
                  // Validate and set default only when user leaves the field
                  const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
                  if (value === '' || value === undefined || value === null || isNaN(numValue) || numValue < 15) {
                    handleInputChange('duration', 120);
                  } else {
                    // Ensure it's stored as a number
                    handleInputChange('duration', numValue);
                  }
                }}
                fullWidth
                inputProps={{ min: 15, step: 15 }}
                helperText="Meeting duration in minutes (default: 120 minutes / 2 hours)"
              />
            )}

            <TextField
              label="Location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              fullWidth
            />

            {loading ? (
              <CircularProgress size={24} />
            ) : (
              <FormControl fullWidth>
                <InputLabel>Book (Optional)</InputLabel>
                <Select
                  value={formData.bookId}
                  onChange={(e) => handleInputChange('bookId', e.target.value)}
                  label="Book (Optional)"
                >
                  <MenuItem value="">None</MenuItem>
                  {books.map((book) => (
                    <MenuItem key={book.id} value={book.id}>
                      {book.title} {book.author ? `by ${book.author}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />

            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Notification Reminders
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Set when members should be notified about this meeting. Members must have notifications enabled in their profile.
              </Typography>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.notifyOneWeekBefore}
                    onChange={(e) => handleInputChange('notifyOneWeekBefore', e.target.checked)}
                  />
                }
                label="Notify members 1 week before meeting"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.notifyOneDayBefore}
                    onChange={(e) => handleInputChange('notifyOneDayBefore', e.target.checked)}
                  />
                }
                label="Notify members 1 day before meeting"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}>
            {saving ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                {editingMeeting ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingMeeting ? 'Update' : 'Create'
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default MeetingForm;

