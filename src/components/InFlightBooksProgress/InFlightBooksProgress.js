import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  CircularProgress,
  Button
} from '@mui/material';
import { getBooksProgress } from 'services/books/books.service';
import useClubContext from 'contexts/Club';

const InFlightBooksProgress = () => {
  const { currentClub } = useClubContext();
  const [booksData, setBooksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPages, setUserPages] = useState({}); // Track current page per book
  const [hasMoreUsers, setHasMoreUsers] = useState({}); // Track if more users available per book
  const observerRef = useRef(null);

  useEffect(() => {
    const fetchBooksProgress = async () => {
      if (!currentClub) {
        setLoading(false);
        setBooksData([]);
        return;
      }

      try {
        setLoading(true);
        const result = await getBooksProgress(currentClub.id, 1, 10);
        
        if (result && result.books) {
          setBooksData(result.books);
          
          // Initialize pagination state for each book
          const initialPages = {};
          const initialHasMore = {};
          result.books.forEach(book => {
            initialPages[book.id] = 1;
            // Check if there are more users (if we got 10, there might be more)
            // Also check if we have more than 5 users (since we show 3-5 initially)
            initialHasMore[book.id] = (book.users && book.users.length === 10) || 
                                     (book.stats && book.stats.readerCount > (book.users?.length || 0));
          });
          setUserPages(initialPages);
          setHasMoreUsers(initialHasMore);
        } else {
          setBooksData([]);
        }
      } catch (error) {
        console.error('Error fetching books progress:', error);
        // Set empty array on error so we show the "no books" message
        setBooksData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBooksProgress();
  }, [currentClub]);

  const formatDiscussionDate = (date) => {
    if (!date) return 'No date set';
    
    const discussionDate = new Date(date);
    
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

  const loadMoreUsers = useCallback(async (bookId) => {
    if (!hasMoreUsers[bookId] || !currentClub) return;
    
    try {
      const nextPage = (userPages[bookId] || 1) + 1;
      const result = await getBooksProgress(currentClub.id, nextPage, 10, bookId);
      
      if (result && result.book) {
        const book = result.book;
        if (book.users && book.users.length > 0) {
          setBooksData(prev => prev.map(b => {
            if (b.id === bookId) {
              // Append new users to existing ones
              return {
                ...b,
                users: [...b.users, ...book.users]
              };
            }
            return b;
          }));
          
          setUserPages(prev => ({ ...prev, [bookId]: nextPage }));
          // Check if there might be more users (if we got 10, there might be more)
          setHasMoreUsers(prev => ({ ...prev, [bookId]: book.users.length === 10 }));
        } else {
          // No more users for this book
          setHasMoreUsers(prev => ({ ...prev, [bookId]: false }));
        }
      }
    } catch (error) {
      console.error('Error loading more users:', error);
      setHasMoreUsers(prev => ({ ...prev, [bookId]: false }));
    }
  }, [userPages, hasMoreUsers, currentClub]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!booksData || booksData.length === 0) {
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
      
      {booksData.map((book) => {
        // Show 3-5 users initially, then show all loaded users
        const initialUsersCount = Math.min(5, book.users.length);
        const currentPage = userPages[book.id] || 1;
        // Show initial 5, then all users from subsequent pages
        const displayedUsers = currentPage === 1 
          ? book.users.slice(0, initialUsersCount)
          : book.users;
        // Show load more if: we're on page 1, have more than 5 users loaded, or stats indicate more users exist
        const showLoadMore = hasMoreUsers[book.id] && (
          (currentPage === 1 && book.users.length > initialUsersCount) ||
          (book.stats && book.stats.readerCount > book.users.length)
        );

        return (
          <Card key={book.id} sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={3}>
                  <Box display="flex" alignItems="center" gap={2}>
                    {book.coverImage && (
                      <img
                        src={book.coverImage}
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
                  {book.stats && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        {book.stats.activeReaders} active readers • {book.stats.finishedReaders} finished • 
                        Avg: {Math.round(book.stats.avgPercent)}% complete
                      </Typography>
                    </Box>
                  )}
                  
                  <Box>
                    {displayedUsers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No progress data available
                      </Typography>
                    ) : (
                      <>
                        {displayedUsers.map((userProgress, index) => (
                          <Box key={`${userProgress.userId}-${index}`} sx={{ mb: 1 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <Avatar
                                src={userProgress.photoUrl}
                                sx={{ width: 24, height: 24 }}
                              >
                                {userProgress.displayName?.charAt(0) || '?'}
                              </Avatar>
                              <Typography variant="body2" sx={{ minWidth: 100 }}>
                                {userProgress.displayName || 'Unknown User'}
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
                            
                            {index < displayedUsers.length - 1 && <Divider sx={{ mt: 1 }} />}
                          </Box>
                        ))}
                        
                        {showLoadMore && (
                          <Box mt={2} display="flex" justifyContent="center">
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => loadMoreUsers(book.id)}
                            >
                              Load More Users
                            </Button>
                          </Box>
                        )}
                      </>
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
