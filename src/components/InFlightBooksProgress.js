import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Avatar,
  Chip,
  Grid,
  Divider,
  CircularProgress
} from '@mui/material';
import { getAllUsersProgressForBook, getBookStats, getAllUsers } from '../services/firestoreService';

const InFlightBooksProgress = ({ books }) => {
  const [bookProgressData, setBookProgressData] = useState({});
  const [bookStatsData, setBookStatsData] = useState({});
  const [usersData, setUsersData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!books || books.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Fetch all users data first
        const allUsers = await getAllUsers();
        const usersMap = {};
        allUsers.forEach(user => {
          usersMap[user.id] = user;
        });
        setUsersData(usersMap);
        
        const progressPromises = books.map(async (book) => {
          const [progress, stats] = await Promise.all([
            getAllUsersProgressForBook(book.id),
            getBookStats(book.id)
          ]);
          return { bookId: book.id, progress, stats };
        });

        const results = await Promise.all(progressPromises);
        
        const progressData = {};
        const statsData = {};
        
        results.forEach(({ bookId, progress, stats }) => {
          progressData[bookId] = progress;
          statsData[bookId] = stats;
        });

        setBookProgressData(progressData);
        setBookStatsData(statsData);
      } catch (error) {
        // Error fetching progress data
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [books]);

  const formatDiscussionDate = (date) => {
    if (!date) return 'No date set';
    
    let discussionDate;
    if (date.seconds) {
      discussionDate = new Date(date.seconds * 1000);
    } else {
      discussionDate = new Date(date);
    }
    
    return discussionDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const sortUsersByProgress = (users) => {
    return users.sort((a, b) => {
      // First sort by status: finished > reading > not_started
      const statusOrder = { 'finished': 0, 'reading': 1, 'not_started': 2 };
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      
      if (statusDiff !== 0) return statusDiff;
      
      // Within same status, sort by percentage (descending)
      if (a.status === 'reading' && b.status === 'reading') {
        return (b.percentComplete || 0) - (a.percentComplete || 0);
      }
      
      return 0;
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'finished': return 'success';
      case 'reading': return 'primary';
      case 'not_started': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'finished': return 'Finished';
      case 'reading': return 'Reading';
      case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!books || books.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" color="text.secondary" textAlign="center">
            No books with upcoming discussions
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        In Flight Books
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Books with upcoming discussion dates - see everyone's progress
      </Typography>
      
      {books.map((book) => {
        const progress = bookProgressData[book.id] || [];
        const stats = bookStatsData[book.id];
        const sortedUsers = sortUsersByProgress(progress);

        return (
          <Card key={book.id} sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {book.coverUrl && (
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        style={{
                          width: 60,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 4
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="h6" noWrap>
                        {book.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        by {book.author}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Discussion: {formatDiscussionDate(book.discussionDate)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={9}>
                  {stats && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        {stats.activeReaders} active readers • {stats.finishedReaders} finished • 
                        Avg: {Math.round(stats.avgPercent)}% complete
                      </Typography>
                    </Box>
                  )}
                  
                  <Box>
                    {sortedUsers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No progress data available
                      </Typography>
                    ) : (
                      sortedUsers.map((userProgress, index) => {
                        const user = usersData[userProgress.userId];
                        return (
                          <Box key={userProgress.id} sx={{ mb: 1 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <Avatar
                                src={user?.photoURL}
                                sx={{ width: 24, height: 24 }}
                              >
                                {user?.displayName?.charAt(0) || '?'}
                              </Avatar>
                              <Typography variant="body2" sx={{ minWidth: 100 }}>
                                {user?.displayName || 'Unknown User'}
                              </Typography>
                            <Chip
                              label={getStatusLabel(userProgress.status)}
                              size="small"
                              color={getStatusColor(userProgress.status)}
                              variant="outlined"
                            />
                            {userProgress.status === 'reading' && (
                              <Typography variant="body2" color="text.secondary">
                                {Math.round(userProgress.percentComplete || 0)}%
                              </Typography>
                            )}
                          </Box>
                          
                          {userProgress.status === 'reading' && (
                            <LinearProgress
                              variant="determinate"
                              value={userProgress.percentComplete || 0}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          )}
                          
                          {index < sortedUsers.length - 1 && <Divider sx={{ mt: 1 }} />}
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
};

export default InFlightBooksProgress;
