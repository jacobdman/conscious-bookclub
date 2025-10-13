import React, { useState, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { getPosts, addPost, getBooks } from './services/firestoreService';
import { useAuth } from './AuthContext';
import Layout from './components/Layout';
import NextMeetingCard from './components/NextMeetingCard';
import CurrentBooksSection from './components/CurrentBooksSection';
import GoalsCard from './components/GoalsCard';
import QuickGoalCompletion from './components/QuickGoalCompletion';
import FeedSection from './components/FeedSection';

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
      
      const allBooksData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log("Book data:", { id: doc.id, ...data });
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
      
      console.log("Upcoming books data:", upcomingBooks);
      setCurrentBooks(upcomingBooks);
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
        
        <QuickGoalCompletion />
        
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
