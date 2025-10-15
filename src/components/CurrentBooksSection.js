import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
  TextField,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../AuthContext';
import { getUserBookProgress, updateUserBookProgress } from '../services/firestoreService';

const CurrentBooksSection = ({ books }) => {
  const { user } = useAuth();
  const [bookProgress, setBookProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState({});
  const [percentInputs, setPercentInputs] = useState({});

  
  // Load progress for all books when component mounts or books change
  useEffect(() => {
    if (!user || !books || books.length === 0) return;

    const loadProgress = async () => {
      const progressPromises = books.map(async (book) => {
        try {
          const progress = await getUserBookProgress(user.uid, book.id);
          return { bookId: book.id, progress };
        } catch (error) {
          return { bookId: book.id, progress: null };
        }
      });

      const results = await Promise.all(progressPromises);
      const progressMap = {};
      results.forEach(({ bookId, progress }) => {
        progressMap[bookId] = progress;
      });
      setBookProgress(progressMap);
    };

    loadProgress();
  }, [user, books]);

  const formatDiscussionDate = (date) => {
    if (!date) return 'TBD';
    
    let discussionDate;
    if (date.seconds) {
      discussionDate = new Date(date.seconds * 1000);
    } else {
      discussionDate = new Date(date);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const discussionDay = new Date(discussionDate);
    discussionDay.setHours(0, 0, 0, 0);
    
    const diffTime = discussionDay - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays > 1) {
      return `In ${diffDays} days`;
    } else {
      return discussionDate.toLocaleDateString();
    }
  };

  const getButtonText = (bookId) => {
    const progress = bookProgress[bookId];
    if (!progress || progress.status === 'not-started') {
      return 'Mark as Started';
    } else if (progress.status === 'reading') {
      return 'Mark as Finished';
    } else if (progress.status === 'finished') {
      return 'Mark as Started';
    }
    return 'Mark as Started';
  };

  const handleProgressUpdate = async (bookId) => {
    if (!user) return;

    setLoadingProgress(prev => ({ ...prev, [bookId]: true }));

    try {
      const currentProgress = bookProgress[bookId];
      let newStatus;
      let updateData = {};

      if (!currentProgress || currentProgress.status === 'not_started') {
        newStatus = 'reading';
        updateData = {
          status: newStatus,
          startedAt: new Date(),
          privacy: 'public'
        };
      } else if (currentProgress.status === 'reading') {
        newStatus = 'finished';
        updateData = {
          status: newStatus,
          finishedAt: new Date(),
          percentComplete: 100,
          privacy: 'public'
        };
      } else if (currentProgress.status === 'finished') {
        newStatus = 'reading';
        updateData = {
          status: newStatus,
          startedAt: new Date(),
          finishedAt: null,
          percentComplete: null,
          privacy: 'public'
        };
      }

      await updateUserBookProgress(user.uid, bookId, updateData);
      
      // Update local state
      setBookProgress(prev => ({
        ...prev,
        [bookId]: {
          ...prev[bookId],
          ...updateData
        }
      }));
    } catch (error) {
      // Error updating book progress
    } finally {
      setLoadingProgress(prev => ({ ...prev, [bookId]: false }));
    }
  };

  const handlePercentChange = (bookId, value) => {
    setPercentInputs(prev => ({ ...prev, [bookId]: value }));
  };

  const updatePercentProgress = async (bookId) => {
    if (!user) return;
    
    const percentValue = percentInputs[bookId];
    if (!percentValue || percentValue < 0 || percentValue > 100) return;

    setLoadingProgress(prev => ({ ...prev, [bookId]: true }));

    try {
      const currentProgress = bookProgress[bookId];
      const percentInt = parseInt(percentValue);
      let updateData = {
        percentComplete: percentInt,
        privacy: 'public'
      };

      // If user sets 100%, automatically advance to finished status
      if (percentInt === 100 && currentProgress?.status === 'reading') {
        updateData = {
          ...updateData,
          status: 'finished',
          finishedAt: new Date()
        };
      }

      await updateUserBookProgress(user.uid, bookId, updateData);

      // Update local state
      setBookProgress(prev => ({
        ...prev,
        [bookId]: {
          ...prev[bookId],
          ...updateData
        }
      }));
    } catch (error) {
      // Error updating percent progress
    } finally {
      setLoadingProgress(prev => ({ ...prev, [bookId]: false }));
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Upcoming Book Discussions</Typography>
      {books?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No upcoming book discussions scheduled. Add discussion dates to books to see them here.
        </Typography>
      )}
      <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2 }}>
        {books?.map((book, index) => (
          <Card key={index} sx={{ minWidth: 200 }}>
            <CardMedia
              component="img"
              height="300"
              image={book.coverUrl || '/logo192.png'}
              alt={book.title}
            />
            <CardContent>
              <Typography variant="subtitle1">{book.title}</Typography>
              <Typography variant="body2" color="text.secondary">{book.author}</Typography>
              <Typography variant="caption" display="block">
                Discussion: {formatDiscussionDate(book.discussionDate)}
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                Theme: {book.theme || 'General'}
              </Typography>
              
              {/* Progress Status Display */}
              {bookProgress[book.id] && (
                <Typography variant="caption" display="block" sx={{ mb: 1 }}>
                  Status: {bookProgress[book.id].status}
                  {bookProgress[book.id].percentComplete && 
                    ` (${bookProgress[book.id].percentComplete}%)`
                  }
                </Typography>
              )}
              
              {/* Progress Update Button */}
              <Button 
                variant="outlined" 
                size="small"
                onClick={() => handleProgressUpdate(book.id)}
                disabled={loadingProgress[book.id]}
                sx={{ mb: 1 }}
              >
                {loadingProgress[book.id] ? (
                  <CircularProgress size={16} />
                ) : (
                  getButtonText(book.id)
                )}
              </Button>
              
              {/* Percentage Input (shown when reading or finished) */}
              {(bookProgress[book.id]?.status === 'reading' || bookProgress[book.id]?.status === 'finished') && (
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    type="number"
                    placeholder="%"
                    value={percentInputs[book.id] || bookProgress[book.id]?.percentComplete || ''}
                    onChange={(e) => handlePercentChange(book.id, e.target.value)}
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: 60 }}
                  />
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => updatePercentProgress(book.id)}
                    disabled={loadingProgress[book.id]}
                  >
                    Update %
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default CurrentBooksSection;
