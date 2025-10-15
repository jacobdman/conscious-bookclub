import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { getBooks } from '../services/firestoreService';
import InFlightBooksProgress from './InFlightBooksProgress';
import FinishedBooksLeaderboard from './FinishedBooksLeaderboard';

const ClubBooksTab = () => {
  const [inFlightBooks, setInFlightBooks] = useState([]);

  const fetchInFlightBooks = useCallback(async () => {
    try {
      const snapshot = await getBooks();
      
      const allBooksData = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, ...data };
      });
      
      // Filter books that have discussion dates and are today or in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const upcomingBooks = allBooksData.filter(book => {
        if (!book.discussionDate) {
          return false; // Skip books without discussion dates
        }
        
        // Convert Firestore timestamp to Date if needed
        let discussionDate;
        if (book.discussionDate.seconds) {
          discussionDate = new Date(book.discussionDate.seconds * 1000);
        } else {
          discussionDate = new Date(book.discussionDate);
        }
        
        // Set time to start of day for comparison
        discussionDate.setHours(0, 0, 0, 0);
        
        return discussionDate >= today;
      });
      
      // Sort by discussion date (earliest first)
      upcomingBooks.sort((a, b) => {
        let dateA, dateB;
        
        if (a.discussionDate.seconds) {
          dateA = new Date(a.discussionDate.seconds * 1000);
        } else {
          dateA = new Date(a.discussionDate);
        }
        
        if (b.discussionDate.seconds) {
          dateB = new Date(b.discussionDate.seconds * 1000);
        } else {
          dateB = new Date(b.discussionDate);
        }
        
        return dateA - dateB;
      });
      
      setInFlightBooks(upcomingBooks);
    } catch (err) {
      // Error fetching books
    }
  }, []);

  useEffect(() => {
    fetchInFlightBooks();
  }, [fetchInFlightBooks]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Club Books
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        See how everyone is progressing on our current books and check out the reading leaderboard!
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <InFlightBooksProgress books={inFlightBooks} />
      </Box>
      
      <Box>
        <FinishedBooksLeaderboard />
      </Box>
    </Box>
  );
};

export default ClubBooksTab;
