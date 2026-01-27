import React, { useEffect, useMemo, useState } from 'react';
import moment from 'moment-timezone';
// UI
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Components
import BookSearch from 'components/BookSearch';
// Services
import { getBook } from 'services/books/books.service';
import { createMeeting, updateMeeting } from 'services/meetings/meetings.service';
// Utils
import { formatLocalDate, parseLocalDate } from 'utils/dateHelpers';
import { getBrowserTimezone } from 'utils/meetingTime';

const MeetingForm = ({
  open,
  onClose,
  onSave,
  editingMeeting = null,
  initialBook = null,
}) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [formData, setFormData] = useState({
    title: '',
    date: null,
    startTime: '',
    duration: 120, // Default to 2 hours (120 minutes)
    location: '',
    bookId: '',
    notes: '',
    theme: '',
    timezone: getBrowserTimezone(),
  });

  const timezoneOptions = useMemo(() => moment.tz.names(), []);
  const themesEnabled = currentClub?.themesEnabled !== false;
  const themeOptions = Array.isArray(currentClub?.themes) && currentClub?.themes.length > 0
    ? currentClub.themes
    : ['Classy', 'Creative', 'Curious'];

  const [selectedBook, setSelectedBook] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open && currentClub) {
      if (editingMeeting) {
        setFormData({
          title: editingMeeting.title || '',
          date: editingMeeting.date ? parseLocalDate(editingMeeting.date) : null,
          startTime: editingMeeting.startTime || '',
          duration: editingMeeting.duration || 120,
          location: editingMeeting.location || '',
          bookId: editingMeeting.bookId || '',
          notes: editingMeeting.notes || '',
          theme: editingMeeting.theme || '',
          timezone: editingMeeting.timezone || getBrowserTimezone(),
        });
        
        // Handle selected book
        if (editingMeeting.book) {
          setSelectedBook(editingMeeting.book);
        } else if (editingMeeting.bookId) {
          // Fetch book details if we only have ID
          getBook(currentClub.id, editingMeeting.bookId)
            .then(book => setSelectedBook(book))
            .catch(err => console.error("Failed to load selected book", err));
        } else {
          setSelectedBook(null);
        }
      } else {
        setFormData({
          title: '',
          date: null,
          startTime: '',
          duration: 120, // Default to 2 hours
          location: '',
          bookId: '',
          notes: '',
          theme: '',
          timezone: getBrowserTimezone(),
        });
        if (initialBook) {
          setSelectedBook(initialBook);
          setFormData((prev) => ({...prev, bookId: initialBook.id}));
        } else {
          setSelectedBook(null);
        }
      }
      setError(null);
    }
  }, [open, editingMeeting, currentClub, initialBook]);

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
        title: formData.title ? formData.title.trim() : null,
        date: formatLocalDate(formData.date), // Format as YYYY-MM-DD using local time
        startTime: formData.startTime || null,
        duration: formData.duration || 120,
        location: formData.location || null,
        bookId: formData.bookId || null,
        notes: formData.notes || null,
        theme: formData.theme || null,
        timezone: formData.timezone || getBrowserTimezone(),
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

            <TextField
              label="Title (Optional)"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              fullWidth
              placeholder="e.g., Game Night, Planning Session"
            />

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
            {console.log(themesEnabled)}

            {themesEnabled && (
              <FormControl fullWidth>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={formData.theme}
                  label="Theme"
                  onChange={(e) => handleInputChange('theme', e.target.value)}
                >
                  <MenuItem value="">
                    <em>No theme</em>
                  </MenuItem>
                  {themeOptions.map((themeOption) => (
                    <MenuItem key={themeOption} value={themeOption}>
                      {themeOption}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

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

            <Autocomplete
              options={timezoneOptions}
              value={formData.timezone || ''}
              onChange={(event, newValue) => {
                handleInputChange('timezone', newValue || getBrowserTimezone());
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Timezone"
                  placeholder="Select timezone"
                  fullWidth
                />
              )}
            />

            <BookSearch
              value={selectedBook}
              onChange={(newValue) => {
                setSelectedBook(newValue);
                handleInputChange('bookId', newValue ? newValue.id : '');
              }}
              enabled={open}
            />

            <TextField
              label="Notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
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
