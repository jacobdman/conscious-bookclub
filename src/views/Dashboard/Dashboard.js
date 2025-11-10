import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { getBooks } from 'services/books/books.service';
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

const Dashboard = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [currentBooks, setCurrentBooks] = useState([]);

  const fetchBooks = useCallback(async () => {
    try {
      if (!user || !currentClub) {
        return;
      }
      
      // Fetch both books and meetings
      const [books, meetings] = await Promise.all([
        getBooks(currentClub.id),
        getMeetings(currentClub.id)
      ]);
      
      const allBooksData = books.map(book => ({ id: book.id, ...book }));
      
      // Create a map of bookId -> earliest upcoming meeting date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const bookMeetingDates = {};
      meetings.forEach(meeting => {
        if (meeting.bookId) {
          const meetingDate = new Date(meeting.date);
          meetingDate.setHours(0, 0, 0, 0);
          
          // Only include meetings that are today or in the future
          if (meetingDate >= today) {
            if (!bookMeetingDates[meeting.bookId] || meetingDate < new Date(bookMeetingDates[meeting.bookId])) {
              bookMeetingDates[meeting.bookId] = meeting.date;
            }
          }
        }
      });
      
      // Filter books that have upcoming meetings
      const upcomingBooks = allBooksData.filter(book => {
        return bookMeetingDates[book.id] !== undefined;
      });
      
      // Sort by meeting date (earliest first)
      upcomingBooks.sort((a, b) => {
        const dateA = new Date(bookMeetingDates[a.id]);
        const dateB = new Date(bookMeetingDates[b.id]);
        
        return dateA - dateB;
      });
      
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
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
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

