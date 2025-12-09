import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  FormControl,
  Alert,
  CircularProgress,
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { createMeeting, updateMeeting } from 'services/meetings/meetings.service';
import { getBooksPage, getBook } from 'services/books/books.service';
import { formatLocalDate } from 'utils/dateHelpers';

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
  });

  // Autocomplete state
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedBook, setSelectedBook] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  const searchTimeoutRef = useRef(null);
  const PAGE_SIZE = 20;

  const fetchBooks = useCallback(async (pageNum, search) => {
    if (!currentClub) return;
    try {
      setLoadingBooks(true);
      const result = await getBooksPage(
        currentClub.id, 
        pageNum, 
        PAGE_SIZE, 
        'created_at', 
        'desc', 
        null, 
        search
      );
      
      const newBooks = result.books || [];
      
      setBooks(prev => pageNum === 1 ? newBooks : [...prev, ...newBooks]);
      setHasMore(newBooks.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error loading books:', err);
    } finally {
      setLoadingBooks(false);
    }
  }, [currentClub]);

  useEffect(() => {
    if (open && currentClub) {
      // Reset state
      setPage(1);
      setHasMore(true);
      setInputValue('');
      setBooks([]);
      
      // Initial fetch
      fetchBooks(1, '');

      if (editingMeeting) {
        setFormData({
          date: editingMeeting.date ? new Date(editingMeeting.date) : null,
          startTime: editingMeeting.startTime || '',
          duration: editingMeeting.duration || 120,
          location: editingMeeting.location || '',
          bookId: editingMeeting.bookId || '',
          notes: editingMeeting.notes || '',
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
          date: null,
          startTime: '',
          duration: 120, // Default to 2 hours
          location: '',
          bookId: '',
          notes: '',
        });
        setSelectedBook(null);
      }
      setError(null);
    }
  }, [open, editingMeeting, currentClub, fetchBooks]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearchChange = (event, newInputValue) => {
    setInputValue(newInputValue);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchBooks(1, newInputValue);
    }, 500);
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
        date: formatLocalDate(formData.date), // Format as YYYY-MM-DD using local time
        startTime: formData.startTime || null,
        duration: formData.duration || 120,
        location: formData.location || null,
        bookId: formData.bookId || null,
        notes: formData.notes || null,
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

            <Autocomplete
              options={books}
              getOptionLabel={(option) => {
                if (!option) return '';
                return `${option.title}${option.author ? ` by ${option.author}` : ''}`;
              }}
              value={selectedBook}
              onChange={(event, newValue) => {
                setSelectedBook(newValue);
                handleInputChange('bookId', newValue ? newValue.id : '');
              }}
              inputValue={inputValue}
              onInputChange={handleSearchChange}
              loading={loadingBooks}
              ListboxProps={{
                onScroll: (event) => {
                  const listboxNode = event.currentTarget;
                  if (
                    listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 20 &&
                    hasMore &&
                    !loadingBooks
                  ) {
                    const nextPage = page + 1;
                    setPage(nextPage);
                    fetchBooks(nextPage, inputValue);
                  }
                }
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Book (Optional)"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <React.Fragment>
                        {loadingBooks ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </React.Fragment>
                    ),
                  }}
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.title} {option.author ? `by ${option.author}` : ''}
                </li>
              )}
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
