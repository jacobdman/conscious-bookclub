import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Button
} from '@mui/material';
import { getBooksProgress } from 'services/books/books.service';
import { getMeetings } from 'services/meetings/meetings.service';
import useClubContext from 'contexts/Club';
import ProfileAvatar from 'components/ProfileAvatar';
import BookProgressRing from './BookProgressRing';
import { parseLocalDate } from 'utils/dateHelpers';

const InFlightBooksProgress = () => {
  const { currentClub } = useClubContext();
  const [booksData, setBooksData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPages, setUserPages] = useState({}); // Track current page per book
  const [hasMoreUsers, setHasMoreUsers] = useState({}); // Track if more users available per book
  const [meetingDates, setMeetingDates] = useState({}); // Map of bookId -> earliest meeting date

  const parseMeetingDate = useCallback((dateValue) => {
    if (!dateValue) return null;

    // Handle date-only strings as local dates to avoid UTC shifting a day backward
    if (typeof dateValue === 'string') {
      const dateOnlyMatch = /^(\d{4}-\d{2}-\d{2})$/.exec(dateValue);
      if (dateOnlyMatch) {
        return parseLocalDate(dateOnlyMatch[1]);
      }
    }

    const parsed = new Date(dateValue);
    return isNaN(parsed) ? null : parsed;
  }, []);

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

  useEffect(() => {
    const loadMeetings = async () => {
      if (!currentClub) return;
      
      try {
        const meetings = await getMeetings(currentClub.id);
        // Create a map of bookId -> earliest meeting date
        const datesMap = {};
        meetings.forEach(meeting => {
          if (meeting.bookId) {
            const meetingDate = parseMeetingDate(meeting.date);
            if (!meetingDate) return;
            if (!datesMap[meeting.bookId] || meetingDate < datesMap[meeting.bookId]) {
              datesMap[meeting.bookId] = meetingDate;
            }
          }
        });
        setMeetingDates(datesMap);
      } catch (error) {
        console.error('Error loading meetings:', error);
      }
    };

    loadMeetings();
  }, [currentClub, parseMeetingDate]);

  const formatDiscussionDate = (date) => {
    if (!date) return 'No date set';

    const discussionDate = parseMeetingDate(date);
    if (!discussionDate) return 'No date set';

    return discussionDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
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
        // Always show all loaded users; container scrolls when longer than ~5.5 rows
        const displayedUsers = book.users || [];
        const currentPage = userPages[book.id] || 1;
        // Show load more if backend indicates more users remain beyond what is loaded
        const showLoadMore = hasMoreUsers[book.id] && (
          (book.stats && book.stats.readerCount > displayedUsers.length) ||
          displayedUsers.length >= currentPage * 10
        );

        // Use average book progress percentage (avgPercent) for the ring
        // This shows how much of the book the club has read overall
        const bookProgressPercentage = book.stats?.avgPercent || 0;

        return (
          <Card key={book.id} sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="flex-start" justifyContent="space-between">
                <Grid item xs={12} md="auto">
                  <Box display="flex" alignItems="flex-start" gap={2}>
                    {book.coverImage && (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        style={{
                          width: 60,
                          height: 80,
                          objectFit: 'cover',
                          borderRadius: 4,
                          flexShrink: 0
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
                        Discussion: {formatDiscussionDate(meetingDates[book.id])}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                {book.stats && (
                  <Grid item xs={12} md="auto">
                    <Box 
                      display="flex" 
                      flexDirection="column" 
                      alignItems="center"
                      sx={{ 
                        mt: { xs: 1, md: 0 }
                      }}
                    >
                      <BookProgressRing value={bookProgressPercentage} size={70} />
                      <Box sx={{ mt: 0.5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                          club
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                          progress
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12} md={9}>
                  {book.stats && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        {book.stats.activeReaders} active readers • {book.stats.finishedReaders} finished • 
                        Avg: {Math.round(book.stats.avgPercent)}% complete
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ maxHeight: 280, overflowY: 'auto', pr: 1 }}>
                    {displayedUsers.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No progress data available
                      </Typography>
                    ) : (
                      <>
                        {displayedUsers.map((userProgress, index) => (
                          <Box key={`${userProgress.userId}-${index}`} sx={{ mb: 1 }}>
                            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                              <ProfileAvatar
                                user={userProgress}
                                size={24}
                                showEntryRing={false}
                              />
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
