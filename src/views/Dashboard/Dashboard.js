import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { getPosts, addPost } from 'services/posts/posts.service';
import { getBooks } from 'services/books/books.service';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import GoalsProvider from 'contexts/Goals/GoalsProvider';
import Layout from 'components/Layout';
import NextMeetingCard from 'components/NextMeetingCard';
import CurrentBooksSection from 'components/CurrentBooksSection';
import GoalsCard from 'components/Goals/GoalsCard';
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
  const [goals] = useState([]);

  const fetchPosts = async () => {
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
  };

  const fetchBooks = useCallback(async () => {
    try {
      if (!user || !currentClub) {
        return;
      }
      
      const books = await getBooks(currentClub.id);
      
      const allBooksData = books.map(book => ({ id: book.id, ...book }));
      
      // Filter books that have discussion dates and are today or in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      
      const upcomingBooks = allBooksData.filter(book => {
        if (!book.discussionDate) {
          return false; // Skip books without discussion dates
        }
        
        const discussionDate = new Date(book.discussionDate);
        
        // Set time to start of day for comparison
        discussionDate.setHours(0, 0, 0, 0);
        
        return discussionDate >= today;
      });
      
      // Sort by discussion date (earliest first)
      upcomingBooks.sort((a, b) => {
        const dateA = new Date(a.discussionDate);
        const dateB = new Date(b.discussionDate);
        
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
  }, [user, fetchBooks]);

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

