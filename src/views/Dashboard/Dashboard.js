import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { getMeetings } from 'services/meetings/meetings.service';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import GoalsProvider from 'contexts/Goals/GoalsProvider';
import FeedProvider from 'contexts/Feed/FeedProvider';
import Layout from 'components/Layout';
import NextMeetingCard from 'components/NextMeetingCard';
import CurrentBooksSection from 'components/CurrentBooksSection';
import QuickGoalCompletion from 'components/QuickGoalCompletion';
import FeedPreview from 'components/FeedPreview';
import PWAInstallPrompt from 'components/PWAInstallPrompt';
import NotificationPrompt from 'components/NotificationPrompt';
import HabitConsistencyLeaderboardWithData from 'components/HabitConsistencyLeaderboard/HabitConsistencyLeaderboardWithData';
import QuoteOfWeek from 'components/QuoteOfWeek';
import { parseLocalDate } from 'utils/dateHelpers';
import { sanitizeDashboardConfig, isSectionEnabled } from 'utils/dashboardConfig';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [currentBooks, setCurrentBooks] = useState([]);
  const [nextMeetings, setNextMeetings] = useState([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [meetingsError, setMeetingsError] = useState(null);
  const navigate = useNavigate();
  const dashboardConfig = useMemo(
      () => sanitizeDashboardConfig(currentClub?.dashboardConfig),
      [currentClub],
  );

  const fetchBooks = useCallback(async () => {
    try {
      if (!user || !currentClub) {
        return;
      }
      
      // Get today's date in YYYY-MM-DD format for start_date filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = today.toISOString().split('T')[0];
      
      // Fetch meetings with user progress included and filtered by start_date
      const meetings = await getMeetings(currentClub.id, user.uid, startDate);
      
      // Extract books from meetings, including progress from the meeting response
      const bookMap = new Map();
      
      meetings.forEach(meeting => {
        if (meeting.book && meeting.bookId) {
          const bookId = meeting.book.id || meeting.bookId;
          
          // If we haven't seen this book yet, or this meeting is earlier, update it
          if (!bookMap.has(bookId)) {
            const bookData = {
              id: bookId,
              ...meeting.book,
              chosenForBookclub: true, // If the book is in a meeting, it's chosen for bookclub
              progress: meeting.book.progress || null, // Progress is nested in book.progress
              meetingTheme: meeting.theme || null,
            };
            bookMap.set(bookId, {
              book: bookData,
              meetingDate: meeting.date,
            });
          } else {
            const existing = bookMap.get(bookId);
            const meetingDate = parseLocalDate(meeting.date);
            const existingDate = parseLocalDate(existing.meetingDate);
            if (meetingDate < existingDate) {
              // This meeting is earlier, update the meeting date
              bookMap.set(bookId, {
                ...existing,
                meetingDate: meeting.date,
              });
            }
          }
        }
      });
      
      // Convert map to array and sort by meeting date
      const upcomingBooks = Array.from(bookMap.values())
        .sort((a, b) => {
          const aDate = parseLocalDate(a.meetingDate);
          const bDate = parseLocalDate(b.meetingDate);
          return aDate - bDate;
        })
        .map(item => item.book);
      
      setCurrentBooks(upcomingBooks);
    } catch (err) {
      // Error fetching books
    }
  }, [user, currentClub]);

  const fetchNextMeetings = useCallback(async () => {
    try {
      if (!user || !currentClub) {
        return;
      }

      setMeetingsLoading(true);
      setMeetingsError(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startDate = today.toISOString().split('T')[0];

      const meetings = await getMeetings(currentClub.id, user.uid, startDate, null, 3);
      setNextMeetings(meetings);
    } catch (err) {
      setMeetingsError(err?.message || 'Failed to load meetings');
      console.error('Error fetching next meetings:', err);
      setNextMeetings([]);
    } finally {
      setMeetingsLoading(false);
    }
  }, [user, currentClub]);


  useEffect(() => {
    if (user) {
      fetchBooks();
      fetchNextMeetings();
    }
  }, [user, fetchBooks, fetchNextMeetings]);

  // Ensure page starts at top when Dashboard loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <GoalsProvider>
      <FeedProvider>
      <Layout>
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 2,
            }}
          >
          <PWAInstallPrompt />
          <NotificationPrompt />
          {currentClub && (
            <Typography variant="h5" sx={{ mb: 1 }}>
              {currentClub.name}
            </Typography>
          )}
          {dashboardConfig
              .filter((section) => isSectionEnabled(dashboardConfig, section.id))
              .map((section) => {
                const sectionId = section.id;
                switch (sectionId) {
                  case 'habitLeaderboard':
                    return currentClub ? (
                      <HabitConsistencyLeaderboardWithData key={sectionId} />
                    ) : null;
                  case 'nextMeeting':
                    return (
                      <NextMeetingCard
                        key={sectionId}
                        meetings={nextMeetings}
                        loading={meetingsLoading}
                        error={meetingsError}
                      />
                    );
                  case 'quickGoals':
                    return (
                      <React.Fragment key={sectionId}>
                        <QuickGoalCompletion />
                        <Paper
                          sx={{
                            p: 1,
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          elevation={1}
                        >
                          <Button
                            fullWidth
                            endIcon={<ArrowForward />}
                            onClick={() => navigate('/club/goals')}
                            sx={{ textTransform: 'none', lineHeight: 1.2 }}
                          >
                            View Full Goals Report
                          </Button>
                        </Paper>
                      </React.Fragment>
                    );
                  case 'quote':
                    return <QuoteOfWeek key={sectionId} />;
                  case 'upcomingBooks':
                    return (
                      <React.Fragment key={sectionId}>
                        <CurrentBooksSection books={currentBooks} />
                        <Paper
                          sx={{
                            p: 1,
                            textAlign: 'center',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          elevation={1}
                        >
                          <Button
                            fullWidth
                            endIcon={<ArrowForward />}
                            onClick={() => navigate('/club/books')}
                            sx={{ textTransform: 'none', lineHeight: 1.2 }}
                          >
                            View Full Book Report
                          </Button>
                        </Paper>
                      </React.Fragment>
                    );
                  case 'feed':
                    return <FeedPreview key={sectionId} />;
                  default:
                    return null;
                }
              })}
        </Box>
      </Layout>
      </FeedProvider>
    </GoalsProvider>
  );
};

export default Dashboard;
