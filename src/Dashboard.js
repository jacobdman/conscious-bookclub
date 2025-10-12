import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { getPosts, addPost, getBooks } from './services/firestoreService';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import NextMeetingCard from './components/NextMeetingCard';
import CurrentBooksSection from './components/CurrentBooksSection';
import GoalsCard from './components/GoalsCard';
import FeedSection from './components/FeedSection';
import SeedBooksButton from './components/SeedBooksButton';

const Dashboard = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState(null);
  const [newPostText, setNewPostText] = useState('');
  const [currentBooks, setCurrentBooks] = useState([]);
  const [goals] = useState([]);

  const fetchPosts = async () => {
    try {
      setLoadingPosts(true);
      const snapshot = await getPosts();
      const postsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPosts(postsData);
    } catch (err) {
      setErrorPosts('Failed to fetch posts.');
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchBooks = useCallback(async () => {
    try {
      console.log("Fetching books from Firestore...");
      console.log("Current user:", user);
      console.log("User authenticated:", !!user);
      
      if (!user) {
        console.log("No user authenticated, skipping books fetch");
        return;
      }
      
      const snapshot = await getBooks();
      console.log("Books snapshot:", snapshot);
      console.log("Number of books found:", snapshot.docs.length);
      
      const booksData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Book data:", { id: doc.id, ...data });
        return { id: doc.id, ...data };
      });
      
      console.log("Final books data:", booksData);
      setCurrentBooks(booksData);
    } catch (err) {
      console.error("Error fetching books: ", err);
      console.error("Error details:", err.code, err.message);
    }
  }, [user]);


  useEffect(() => {
    if (user) {
      fetchPosts();
      fetchBooks();
    }
  }, [user, fetchBooks]);

  // Add a manual refresh button for testing
  const handleRefreshBooks = () => {
    console.log("Manually refreshing books...");
    fetchBooks();
  };

  const handleCreatePost = async () => {
    if (!newPostText.trim() || !user) return;

    try {
      const newPost = {
        authorId: user.uid,
        authorName: user.displayName || user.email,
        text: newPostText,
        createdAt: new Date(),
        reactionCounts: { thumbsUp: 0, thumbsDown: 0, heart: 0, laugh: 0 },
      };
      await addPost(newPost);
      setNewPostText('');
      fetchPosts();
    } catch (err) {
      console.error("Error adding post: ", err);
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <NextMeetingCard />
        
        <SeedBooksButton />
        
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <Button variant="outlined" onClick={handleRefreshBooks} size="small">
            Refresh Books
          </Button>
          <Typography variant="caption" sx={{ alignSelf: 'center' }}>
            Books count: {currentBooks.length}
          </Typography>
        </Box>
        
        <CurrentBooksSection books={currentBooks} />
        
        <GoalsCard goals={goals} />
        
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
  );
};

export default Dashboard;
