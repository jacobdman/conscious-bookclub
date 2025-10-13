import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';

const FeedSection = ({ 
  posts, 
  newPostText, 
  onNewPostTextChange, 
  onCreatePost, 
  loadingPosts, 
  errorPosts 
}) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Feed</Typography>
        <Typography variant="body2" gutterBottom>Coming soon</Typography>
        {/* <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="What's on your mind?"
            value={newPostText}
            onChange={(e) => onNewPostTextChange(e.target.value)}
            variant="outlined"
          />
          <Button onClick={onCreatePost} variant="contained" sx={{ mt: 1 }}>
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
        </Box> */}
      </CardContent>
    </Card>
  );
};

export default FeedSection;
