import React, { useState, useEffect } from 'react';
import {
  Avatar,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Checkbox,
  Chip,
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
import GoalsLeaderboard from './GoalsLeaderboard';
import { getPosts, addPost } from './firebase';

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [errorPosts, setErrorPosts] = useState(null);
  const [newPostText, setNewPostText] = useState('');

  const user = {
    name: 'Caillou',
    profilePic: '',
    id: 'caillou-test-id' // Hardcoded user ID for testing
  };

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

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async () => {
    if (!newPostText.trim()) return;

    try {
      const newPost = {
        authorId: user.id,
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

  const currentBooks = [
    {
      title: 'The Creative Act: A Way Of Being',
      author: 'Rick Rubin',
      discussionDate: 'May 3, 2025',
      theme: 'Creative',
      cover: 'https://images.penguinrandomhouse.com/cover/9780593652886',
    },
  ];

  const goals = [
    { id: 1, text: 'Read 20 minutes today', completed: false },
    { id: 2, text: 'Finish Chapter 3', completed: true },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="static" color="primary">
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
            Welcome, {user.name}!
          </Typography>
          <Avatar src={user.profilePic} alt={user.name} />
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
                    <Avatar src={post.avatar} alt={post.authorId} sx={{ width: 30, height: 30 }} />
                    <Typography variant="subtitle2">{post.authorId}</Typography>
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
