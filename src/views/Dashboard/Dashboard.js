import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
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
import { parseLocalDate } from 'utils/dateHelpers';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [currentBooks, setCurrentBooks] = useState([]);

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
              progress: meeting.book.progress || null, // Progress is nested in book.progress
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


  useEffect(() => {
    if (user) {
      fetchBooks();
    }
  }, [user, fetchBooks]);

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
          {currentClub && (
            <HabitConsistencyLeaderboardWithData />
          )}
          <NextMeetingCard />
          
          <QuickGoalCompletion />
          
          <CurrentBooksSection books={currentBooks} />

          <FeedPreview />
        </Box>
      </Layout>
      </FeedProvider>
    </GoalsProvider>
  );
};

export default Dashboard;

