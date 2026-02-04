import React, { useEffect, useMemo } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
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
import DashboardTour from 'components/Tours/DashboardTour';
import { useMeetings } from 'hooks/useMeetings';
import { parseLocalDate } from 'utils/dateHelpers';
import { sanitizeDashboardConfig, isSectionEnabled } from 'utils/dashboardConfig';
import { useNavigate } from 'react-router-dom';
import { ArrowForward } from '@mui/icons-material';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const navigate = useNavigate();
  const dashboardConfig = useMemo(
      () => sanitizeDashboardConfig(currentClub?.dashboardConfig),
      [currentClub],
  );

  const startDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  }, []);

  const {
    data: upcomingMeetings = [],
  } = useMeetings(currentClub?.id, user?.uid, { startDate });

  const {
    data: nextMeetings = [],
    isLoading: meetingsLoading,
    error: meetingsError,
  } = useMeetings(currentClub?.id, user?.uid, { startDate, limit: 3 });

  const currentBooks = useMemo(() => {
    if (!Array.isArray(upcomingMeetings) || upcomingMeetings.length === 0) {
      return [];
    }

    const bookMap = new Map();

    upcomingMeetings.forEach(meeting => {
      if (meeting.book && meeting.bookId) {
        const bookId = meeting.book.id || meeting.bookId;

        if (!bookMap.has(bookId)) {
          const bookData = {
            id: bookId,
            ...meeting.book,
            chosenForBookclub: true,
            progress: meeting.book.progress || null,
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
            bookMap.set(bookId, {
              ...existing,
              meetingDate: meeting.date,
            });
          }
        }
      }
    });

    return Array.from(bookMap.values())
      .sort((a, b) => {
        const aDate = parseLocalDate(a.meetingDate);
        const bDate = parseLocalDate(b.meetingDate);
        return aDate - bDate;
      })
      .map(item => item.book);
  }, [upcomingMeetings]);

  const meetingsErrorMessage = meetingsError?.message
    || (meetingsError ? 'Failed to load meetings' : null);

  // Ensure page starts at top when Dashboard loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <GoalsProvider>
      <FeedProvider>
      <Layout>
          <DashboardTour />
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
                      <Box key={sectionId} data-tour="dashboard-leaderboard">
                        <HabitConsistencyLeaderboardWithData />
                      </Box>
                    ) : null;
                  case 'nextMeeting':
                    return (
                      <Box key={sectionId} data-tour="dashboard-meeting">
                        <NextMeetingCard
                          meetings={nextMeetings}
                          loading={meetingsLoading}
                          error={meetingsErrorMessage}
                        />
                      </Box>
                    );
                  case 'quickGoals':
                    return (
                      <Box
                        key={sectionId}
                        data-tour="dashboard-goals"
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                        }}
                      >
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
                      </Box>
                    );
                  case 'quote':
                    return <QuoteOfWeek key={sectionId} />;
                  case 'upcomingBooks':
                    return (
                      <Box
                        key={sectionId}
                        data-tour="dashboard-books"
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1.5,
                        }}
                      >
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
                      </Box>
                    );
                  case 'feed':
                    return (
                      <Box key={sectionId} data-tour="dashboard-feed">
                        <FeedPreview />
                      </Box>
                    );
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
