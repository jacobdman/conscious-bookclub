import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { getPosts, addPost } from 'services/posts/posts.service';
import { getBooks } from 'services/books/books.service';
import { getMeetings } from 'services/meetings/meetings.service';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import GoalsProvider from 'contexts/Goals/GoalsProvider';
import Layout from 'components/Layout';
import NextMeetingCard from 'components/NextMeetingCard';
import CurrentBooksSection from 'components/CurrentBooksSection';
import QuickGoalCompletion from 'components/QuickGoalCompletion';
import FeedSection from 'components/FeedSection';
import PWAInstallPrompt from 'components/PWAInstallPrompt';
import HabitConsistencyLeaderboardWithData from 'components/HabitConsistencyLeaderboard/HabitConsistencyLeaderboardWithData';

const Dashboard = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState(null);
  const [newPostText, setNewPostText] = useState('');
  const [currentBooks, setCurrentBooks] = useState([]);

  const fetchPosts = useCallback(async () => {
    if (!currentClub) return;
    
    try {
      setLoadingPosts(true);
      const posts = await getPosts(currentClub.id);
      const postsData = posts.map(post => ({ id: post.id, ...post }));
      setPosts(postsData);
    } catch (err) {
      setErrorPosts('Failed to fetch posts.');
    } finally {
      setLoadingPosts(false);
    }
  }, [currentClub]);

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
      fetchPosts();
      fetchBooks();
    }
  }, [user, fetchBooks, fetchPosts]);

  const handleCreatePost = async () => {
    if (!newPostText.trim() || !user || !currentClub) return;

    try {
      const newPost = {
        authorId: user.uid,
        authorName: user.displayName || user.email,
        text: newPostText,
        createdAt: new Date(),
        reactionCounts: { thumbsUp: 0, thumbsDown: 0, heart: 0, laugh: 0 },
      };
      await addPost(currentClub.id, newPost);
      setNewPostText('');
      fetchPosts();
    } catch (err) {
      // Error adding post
    }
  };

  return (
    <GoalsProvider>
      <Layout>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <PWAInstallPrompt />
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
          
          <FeedSection 
            posts={posts}
            newPostText={newPostText}
            onNewPostTextChange={setNewPostText}
            onCreatePost={handleCreatePost}
            loadingPosts={loadingPosts}
            errorPosts={errorPosts}
          />
        </Box>
      </Layout>
    </GoalsProvider>
  );
};

export default Dashboard;

