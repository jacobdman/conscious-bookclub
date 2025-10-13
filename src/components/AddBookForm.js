import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { addBook, updateBook } from '../services/firestoreService';

const AddBookForm = ({ open, onClose, onBookAdded, editingBook = null }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    theme: [],
    genre: '',
    coverUrl: '',
    fiction: false,
    discussionDate: ''
  });

  // Update form data when editingBook changes
  React.useEffect(() => {
    if (editingBook) {
      // Format discussion date for input field (YYYY-MM-DD)
      let formattedDate = '';
      if (editingBook.discussionDate) {
        let discussionDate;
        if (editingBook.discussionDate.seconds) {
          discussionDate = new Date(editingBook.discussionDate.seconds * 1000);
        } else {
          discussionDate = new Date(editingBook.discussionDate);
        }
        formattedDate = discussionDate.toISOString().split('T')[0];
      }

      setFormData({
        title: editingBook.title || '',
        author: editingBook.author || '',
        theme: Array.isArray(editingBook.theme) ? editingBook.theme : (editingBook.theme ? [editingBook.theme] : []),
        genre: editingBook.genre || '',
        coverUrl: editingBook.coverUrl || '',
        fiction: Boolean(editingBook.fiction),
        discussionDate: formattedDate
      });
    } else {
      setFormData({
        title: '',
        author: '',
        theme: [],
        genre: '',
        coverUrl: '',
        fiction: false,
        discussionDate: ''
      });
    }
  }, [editingBook]);
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const themeOptions = ['Creative', 'Curious', 'Classy'];
  
  const genres = [
    'Personal Development',
    'Mindfulness & Spirituality',
    'Psychology & Decision Making',
    'Leadership & Productivity',
    'Philosophy & Resilience',
    'Business & Entrepreneurship',
    'Health & Wellness',
    'Relationships & Communication',
    'Creativity & Innovation',
    'History & Biography',
    'Science & Technology',
    'General'
  ];

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleThemeChange = (event) => {
    const value = event.target.value;
    setFormData(prev => ({ ...prev, theme: typeof value === 'string' ? value.split(',') : value }));
    
    // Clear error when user starts selecting
    if (errors.theme) {
      setErrors(prev => ({ ...prev, theme: '' }));
    }
  };

  const handleCheckboxChange = (field) => (event) => {
    setFormData(prev => ({ ...prev, [field]: event.target.checked }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.author.trim()) {
      newErrors.author = 'Author is required';
    }
    
    if (!formData.theme || formData.theme.length === 0) {
      newErrors.theme = 'At least one theme is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError('');

    try {
      const bookData = {
        title: formData.title.trim(),
        author: formData.author.trim(),
        theme: formData.theme,
        genre: formData.genre || null,
        coverUrl: formData.coverUrl.trim() || null,
        fiction: formData.fiction || false, // Ensure it's always a boolean
        discussionDate: formData.discussionDate ? new Date(formData.discussionDate) : null
      };

      if (editingBook) {
        // Update existing book
        await updateBook(editingBook.id, bookData);
      } else {
        // Add new book
        await addBook(bookData);
      }
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        theme: [],
        genre: '',
        coverUrl: '',
        fiction: false,
        discussionDate: ''
      });
      
      onBookAdded();
      onClose();
    } catch (error) {
      console.error('Error adding book:', error);
      setSubmitError('Failed to add book. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        author: '',
        theme: [],
        genre: '',
        coverUrl: '',
        fiction: false,
        discussionDate: ''
      });
      setErrors({});
      setSubmitError('');
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: isMobile ? {} : { minHeight: '700px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          {editingBook ? 'Edit Book' : 'Add New Book'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {editingBook ? 'Update the book information' : 'Add a new book to the club\'s collection'}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Title *"
              value={formData.title}
              onChange={handleChange('title')}
              error={!!errors.title}
              helperText={errors.title}
              fullWidth
              disabled={loading}
            />

            <TextField
              label="Author *"
              value={formData.author}
              onChange={handleChange('author')}
              error={!!errors.author}
              helperText={errors.author}
              fullWidth
              disabled={loading}
            />

            <FormControl fullWidth error={!!errors.theme} disabled={loading}>
              <InputLabel>Theme *</InputLabel>
              <Select
                multiple
                value={formData.theme}
                onChange={handleThemeChange}
                label="Theme *"
                renderValue={(selected) => selected.join(', ')}
              >
                {themeOptions.map((theme) => (
                  <MenuItem key={theme} value={theme}>
                    {theme}
                  </MenuItem>
                ))}
              </Select>
              {errors.theme && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {errors.theme}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth disabled={loading}>
              <InputLabel>Genre</InputLabel>
              <Select
                value={formData.genre}
                onChange={handleChange('genre')}
                label="Genre"
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                {genres.map((genre) => (
                  <MenuItem key={genre} value={genre}>
                    {genre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Cover Image URL"
              value={formData.coverUrl}
              onChange={handleChange('coverUrl')}
              fullWidth
              disabled={loading}
              helperText="Optional: URL to the book's cover image"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.fiction}
                  onChange={handleCheckboxChange('fiction')}
                  disabled={loading}
                />
              }
              label="Fiction"
            />

            <TextField
              label="Discussion Date"
              type="date"
              value={formData.discussionDate}
              onChange={handleChange('discussionDate')}
              fullWidth
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Optional: When will this book be discussed?"
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{ minWidth: 100 }}
          >
            {loading ? (editingBook ? 'Updating...' : 'Adding...') : (editingBook ? 'Update Book' : 'Add Book')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddBookForm;
