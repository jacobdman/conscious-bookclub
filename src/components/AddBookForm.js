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
  Alert
} from '@mui/material';
import { addBook } from '../services/firestoreService';

const AddBookForm = ({ open, onClose, onBookAdded }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    theme: [],
    genre: '',
    coverUrl: ''
  });
  
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
        coverUrl: formData.coverUrl.trim() || null
      };

      await addBook(bookData);
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        theme: [],
        genre: '',
        coverUrl: ''
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
        coverUrl: ''
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
        sx: isMobile ? {} : { minHeight: '600px' }
      }}
    >
      <DialogTitle>
        <Typography variant="h5" component="div">
          Add New Book
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add a new book to the club's collection
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
            {loading ? 'Adding...' : 'Add Book'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default AddBookForm;
