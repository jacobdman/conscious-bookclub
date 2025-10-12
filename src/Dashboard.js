import React, { useState, useEffect, useCallback } from 'react';
import {
  Avatar,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Checkbox,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import GoalsLeaderboard from './GoalsLeaderboard';
import { getPosts, addPost, getBooks, getUserGoals, getGoalChecks } from './firebase';
import { useAuth } from './AuthContext';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5D473A',
    },
    secondary: {
      main: '#BFA480',
    },
    background: {
      default: '#F5F1EA',
    },
  },
  typography: {
    fontFamily: 'Georgia, serif',
  },
});

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState(null);
  const [newPostText, setNewPostText] = useState('');
  const [currentBooks, setCurrentBooks] = useState([]);
  const [goals, setGoals] = useState([]);

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

  const fetchBooks = async () => {
    try {
      const snapshot = await getBooks();
      const booksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCurrentBooks(booksData);
    } catch (err) {
      console.error("Error fetching books: ", err);
    }
  };

  const fetchGoals = useCallback(async () => {
    try {
      const goalsSnapshot = await getUserGoals(user.uid);
      const goalsData = await Promise.all(goalsSnapshot.docs.map(async (doc) => {
        const goal = { id: doc.id, ...doc.data() };
        const checksSnapshot = await getGoalChecks(user.uid, doc.id);
        goal.completed = !checksSnapshot.empty;
        return goal;
      }));
      setGoals(goalsData);
    } catch (err) {
      console.error("Error fetching goals: ", err);
    }
  }, [user]);


  useEffect(() => {
    fetchPosts();
    fetchBooks();
    if (user) {
      fetchGoals();
    }
  }, [user, fetchGoals]);

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

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
            Welcome, {user?.displayName || user?.email || 'User'}!
          </Typography>
          <IconButton color="inherit" onClick={handleLogout} sx={{ mr: 1 }}>
            <LogoutIcon />
          </IconButton>
          <Avatar src={user?.photoURL} alt={user?.displayName || user?.email} />
        </Toolbar>
      </AppBar>

      <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 250, p: 2 }} role="presentation">
          <Typography variant="h6" sx={{ mb: 2 }}>Navigation</Typography>
          <List>
            <ListItem button><ListItemText primary="Dashboard" /></ListItem>
            <ListItem button><ListItemText primary="Calendar" /></ListItem>
            <ListItem button><ListItemText primary="Book Club" /></ListItem>
            <ListItem button><ListItemText primary="Suggestions" /></ListItem>
            <ListItem button><ListItemText primary="Feed" /></ListItem>
            <ListItem button><ListItemText primary="Goals" /></ListItem>
            <ListItem button><ListItemText primary="Profile" /></ListItem>
            <ListItem button onClick={handleLogout}><ListItemText primary="Sign Out" /></ListItem>
          </List>
        </Box>
      </Drawer>

      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <GoalsLeaderboard />
        <Card>
          <CardContent sx={{ py: 1 }}>
            <Typography variant="h6">Next Meeting</Typography>
            <Typography variant="body2">Theme: Creative (Mind)</Typography>
            <Typography variant="body2">Date: May 3, 2025</Typography>
            <Typography variant="body2">Notes: Read/Review other members creative works before the meeting!</Typography>
          </CardContent>
        </Card>

        <Box>
          <Typography variant="h6" gutterBottom>Current Books</Typography>
          <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2 }}>
            {currentBooks.map((book, index) => (
              <Card key={index} sx={{ minWidth: 200 }}>
                <CardMedia
                  component="img"
                  height="300"
                  image={book.cover}
                  alt={book.title}
                />
                <CardContent>
                  <Typography variant="subtitle1">{book.title}</Typography>
                  <Typography variant="body2" color="text.secondary">{book.author}</Typography>
                  <Typography variant="caption" display="block">
                    Discussion: {book.discussionDate}
                  </Typography>
                  <Typography variant="caption" display="block" gutterBottom>
                    Theme: {book.theme}
                  </Typography>
                  <Button variant="outlined" size="small">Mark as Read</Button>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="h6">Today's Goals</Typography>
            {goals.map((goal) => (
              <Box key={goal.id} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Checkbox checked={goal.completed} />
                <Typography variant="body2">{goal.text}</Typography>
              </Box>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Feed</Typography>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                label="What's on your mind?"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                variant="outlined"
              />
              <Button onClick={handleCreatePost} variant="contained" sx={{ mt: 1 }}>
                Post
              </Button>
            </Box>
            {loadingPosts && <CircularProgress />}
            {errorPosts && <Typography color="error">{errorPosts}</Typography>}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {posts.sort((a,b) => b.createdAt.toDate() - a.createdAt.toDate()).map((post) => (
                <Paper key={post.id} elevation={1} sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={post.avatar} alt={post.authorName || post.authorId} sx={{ width: 30, height: 30 }} />
                    <Typography variant="subtitle2">{post.authorName || post.authorId}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 0.5, mb: 1 }}>{post.text}</Typography>
                </Paper>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default Dashboard;
