import React, { useState, useCallback } from 'react';
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
  Checkbox,
  Autocomplete,
  CircularProgress,
  Avatar
} from '@mui/material';
import { addBook, updateBook, deleteBook } from 'services/books/books.service';
import { debouncedSearchBooks } from 'services/googleBooksService';
import useClubContext from 'contexts/Club';

const AddBookForm = ({ open, onClose, onBookAdded, onBookDeleted, editingBook = null }) => {
  const { currentClub } = useClubContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    theme: [],
    genre: '',
    coverImage: '',
    fiction: false,
    description: ''
  });

  // Update form data when editingBook changes
  React.useEffect(() => {
    if (editingBook) {
      // Clean up theme data - remove any escaped quotes or malformed entries
      let cleanTheme = [];
      if (Array.isArray(editingBook.theme)) {
        cleanTheme = editingBook.theme
          .map(t => typeof t === 'string' ? t.replace(/^["']|["']$/g, '') : t) // Remove surrounding quotes
          .filter(t => t && t.trim() !== '') // Remove empty entries
          .filter(t => ['Creative', 'Curious', 'Classy'].includes(t)); // Only allow valid themes
      } else if (editingBook.theme) {
        const cleaned = editingBook.theme.replace(/^["']|["']$/g, '');
        if (['Creative', 'Curious', 'Classy'].includes(cleaned)) {
          cleanTheme = [cleaned];
        }
      }

      const newFormData = {
        title: editingBook.title || '',
        author: editingBook.author || '',
        theme: cleanTheme,
        genre: editingBook.genre || '',
        coverImage: editingBook.coverImage || '',
        fiction: Boolean(editingBook.fiction),
        description: editingBook.description || ''
      };
      setFormData(newFormData);
      
      // Set selectedBook for Autocomplete when editing
      if (editingBook.title) {
        setSelectedBook({
          title: editingBook.title,
          author: editingBook.author,
          coverImage: editingBook.coverImage,
          genre: editingBook.genre,
          description: editingBook.description
        });
      }
    } else {
      setFormData({
        title: '',
        author: '',
        theme: [],
        genre: '',
        coverImage: '',
        fiction: false,
        description: ''
      });
      setSelectedBook(null);
    }
  }, [editingBook]);
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // Autocomplete state
  const [bookSuggestions, setBookSuggestions] = useState([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

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
    'Literature & Fiction',
    'Education & Reference',
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

  // Autocomplete handlers - search using both title and author fields
  const handleBookSearch = useCallback((title, author) => {
    const titleTrimmed = (title || '').trim();
    const authorTrimmed = (author || '').trim();
    
    // Search if we have at least 2 characters in title or author
    if (titleTrimmed.length >= 2 || authorTrimmed.length >= 2) {
      setAutocompleteLoading(true);
      debouncedSearchBooks(titleTrimmed, authorTrimmed, (results) => {
        setBookSuggestions(results);
        setAutocompleteLoading(false);
      });
    } else {
      setBookSuggestions([]);
      setAutocompleteLoading(false);
    }
  }, []);

  const handleBookSelect = (event, value) => {
    if (value) {
      setSelectedBook(value);
      setFormData(prev => ({
        ...prev,
        title: value.title,
        author: value.author,
        coverImage: value.coverImage,
        genre: value.genre || prev.genre,
        description: value.description || prev.description
      }));
    } else {
      setSelectedBook(null);
    }
  };

  const handleTitleInputChange = (event, value) => {
    setFormData(prev => {
      // Search with both title and current author value
      handleBookSearch(value, prev.author);
      return { ...prev, title: value };
    });
    
    // Clear error when user starts typing
    if (errors.title) {
      setErrors(prev => ({ ...prev, title: '' }));
    }
  };

  const handleAuthorChange = (event) => {
    const value = event.target.value;
    setFormData(prev => {
      // Search with both current title and author value
      handleBookSearch(prev.title, value);
      return { ...prev, author: value };
    });
    
    // Clear error when user starts typing
    if (errors.author) {
      setErrors(prev => ({ ...prev, author: '' }));
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
        coverImage: formData.coverImage.trim() || null,
        fiction: formData.fiction || false, // Ensure it's always a boolean
        description: formData.description.trim() || null
      };

      if (!currentClub) {
        setSubmitError('No club selected');
        return;
      }

      if (editingBook) {
        // Update existing book
        const updatedBook = await updateBook(currentClub.id, editingBook.id, bookData);
        onBookAdded(updatedBook); // Pass the updated book data
      } else {
        // Add new book
        const newBookRef = await addBook(currentClub.id, bookData);
        // Use the full response which includes id, createdAt, and all other fields
        const newBook = newBookRef;
        onBookAdded(newBook); // Pass the new book data
      }
      
      // Reset form
      setFormData({
        title: '',
        author: '',
        theme: [],
        genre: '',
        coverImage: '',
        fiction: false,
        description: ''
      });
      setSelectedBook(null);
      setBookSuggestions([]);
      
      onClose();
    } catch (error) {
      setSubmitError('Failed to add book. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingBook || !editingBook.id) return;
    
    if (window.confirm(`Are you sure you want to delete "${editingBook.title}"? This action cannot be undone.`)) {
      if (!currentClub) {
        setSubmitError('No club selected');
        return;
      }

      setLoading(true);
      setSubmitError('');
      
      try {
        await deleteBook(currentClub.id, editingBook.id);
        onBookDeleted(editingBook.id);
        onClose();
      } catch (error) {
        setSubmitError('Failed to delete book. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        author: '',
        theme: [],
        genre: '',
        coverImage: '',
        fiction: false,
        discussionDate: '',
        description: ''
      });
      setSelectedBook(null);
      setBookSuggestions([]);
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
            <Autocomplete
              freeSolo
              options={bookSuggestions}
              value={selectedBook}
              onInputChange={handleTitleInputChange}
              onChange={handleBookSelect}
              getOptionLabel={(option) => {
                if (typeof option === 'string') return option;
                return option.title || '';
              }}
              renderOption={(props, option) => (
                <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {option.coverImage && (
                    <Avatar
                      src={option.coverImage}
                      alt={option.title}
                      sx={{ width: 32, height: 48, borderRadius: 1 }}
                      variant="rounded"
                    />
                  )}
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      {option.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {option.author}
                    </Typography>
                  </Box>
                </Box>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Title *"
                  error={!!errors.title}
                  helperText={errors.title}
                  disabled={loading}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {autocompleteLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              loading={autocompleteLoading}
              noOptionsText="No books found"
              loadingText="Searching books..."
            />

            <TextField
              label="Author *"
              value={formData.author}
              onChange={handleAuthorChange}
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
              value={formData.coverImage}
              onChange={handleChange('coverImage')}
              fullWidth
              disabled={loading}
              helperText="Optional: URL to the book's cover image"
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={handleChange('description')}
              fullWidth
              multiline
              rows={3}
              disabled={loading}
              helperText="Optional: Book description or summary"
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

          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          {editingBook && (
            <Button
              onClick={handleDelete}
              disabled={loading}
              variant="outlined"
              color="error"
              sx={{ mr: 'auto' }}
            >
              Delete
            </Button>
          )}
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
