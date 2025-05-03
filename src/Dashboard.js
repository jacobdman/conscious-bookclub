import React, { useState } from 'react';
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
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

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

  const user = {
    name: 'Caillou',
    profilePic: '',
  };

  const currentBooks = [
    {
      title: 'The Creative Act: A Way Of Being',
      author: 'Rick Rubin',
      discussionDate: 'May 3, 2025',
      theme: 'Creative',
      cover: 'https://images.penguinrandomhouse.com/cover/9780593652886',
    },
    {
      title: "Ender's Game",
      author: 'Orson Scott Card',
      discussionDate: 'May 31, 2025',
      theme: 'Curious',
      cover: 'https://m.media-amazon.com/images/I/81+IUsYtGTL._AC_UF1000,1000_QL80_.jpg',
    },
    {
      title: 'Happy Lies',
      author: 'Melissa Dougherty',
      discussionDate: 'July 5, 2025',
      theme: 'Classy',
      cover: 'https://m.media-amazon.com/images/I/81X47xoPLQL._UF1000,1000_QL80_.jpg',
    },
    {
      title: 'Lonesome Dove',
      author: 'Larry McMurtry',
      discussionDate: 'August 2, 2025',
      theme: 'Creative',
      cover: 'https://m.media-amazon.com/images/I/71JXquqq54L.jpg',
    },
  ];

  const goals = [
    { id: 1, text: 'Read 20 minutes today', completed: false },
    { id: 2, text: 'Finish Chapter 3', completed: true },
  ];

  const initialFeedPosts = [
    { id: 1, user: 'Jabo', avatar: '', text: "It's so good! I'll be re-reading it soon.", reactions: { '👍': 2, '👎': 0, '❤️': 1, '😂': 0 }, reacted: {} },
    { id: 2, user: 'Isaac', avatar: '', text: "Finished Lonesome Dove. Just so good. So freaking good. definitely the best book I ever read.", reactions: { '👍': 1, '👎': 0, '❤️': 0, '😂': 1 }, reacted: {} },
    { id: 3, user: 'Blake', avatar: '', text: "Check it out, goatse! (•)", reactions: { '👍': 0, '👎': 1, '❤️': 0, '😂': 1 }, reacted: {} },
  ];

  const [feedPosts, setFeedPosts] = useState(initialFeedPosts);

  const handleReact = (postId, emoji) => {
    setFeedPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) return post;
        const alreadyReacted = post.reacted[emoji];
        const newReactions = {
          ...post.reactions,
          [emoji]: post.reactions[emoji] + (alreadyReacted ? -1 : 1),
        };
        const newReacted = {
          ...post.reacted,
          [emoji]: !alreadyReacted,
        };
        return { ...post, reactions: newReactions, reacted: newReacted };
      })
    );
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
        {/* Next Meeting Info */}
        <Card>
          <CardContent sx={{ py: 1 }}>
            <Typography variant="h6">Next Meeting</Typography>
            <Typography variant="body2">Theme: Creative (Mind)</Typography>
            <Typography variant="body2">Date: May 3, 2025</Typography>
            <Typography variant="body2">Notes: Read/Review other members creative works before the meeting!</Typography>
          </CardContent>
        </Card>

        {/* Current Books Carousel */}
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

        {/* Goals Section */}
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

        {/* Quick Feed Preview */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recent Posts</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {feedPosts.map((post) => (
                <Paper key={post.id} elevation={1} sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar src={post.avatar} alt={post.user} sx={{ width: 30, height: 30 }} />
                    <Typography variant="subtitle2">{post.user}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ mt: 0.5, mb: 1 }}>{post.text}</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {['👍', '👎', '❤️', '😂'].map((emoji) => (
                      <Chip
                        key={emoji}
                        size="small"
                        label={`${emoji} ${post.reactions[emoji]}`}
                        color={post.reacted[emoji] ? 'secondary' : 'default'}
                        onClick={() => handleReact(post.id, emoji)}
                        variant={post.reacted[emoji] ? 'filled' : 'outlined'}
                        sx={{ px: 0.5, py: 0 }}
                      />
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
            <Button size="small" sx={{ mt: 2 }}>View All</Button>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default Dashboard;

