import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Paper,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import useFeedContext from 'contexts/Feed';
import PostCard from 'components/PostCard';

const FeedSection = () => {
  const { posts, loading, error, createPost } = useFeedContext();
  const [newPostText, setNewPostText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!loading && posts.length > 0) {
      scrollToBottom();
    }
  }, [posts, loading]);

  const handleCreatePost = async () => {
    if (!newPostText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createPost({ text: newPostText.trim() });
      setNewPostText('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error creating post:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreatePost();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        flex: 1,
        backgroundColor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Messages Feed - Scrollable */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Error State */}
        {error && (
          <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
            {error}
          </Typography>
        )}

        {/* Empty State */}
        {!loading && posts.length === 0 && (
          <Box sx={{ py: 6, textAlign: 'center', mt: 'auto' }}>
            <Typography variant="body2" color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        )}

        {/* Posts List - Reversed order, newest at bottom */}
        {!loading && posts.length > 0 && (
          <Box sx={{ mt: 'auto' }}>
            {[...posts].reverse().map((post, index, reversedPosts) => {
              const prevPost = reversedPosts[index - 1];
              const currentAuthorId = post.authorId || post.author?.uid;
              const prevAuthorId = prevPost?.authorId || prevPost?.author?.uid;
              const isFirstInGroup = index === 0 || prevAuthorId !== currentAuthorId;
              return (
                <PostCard key={post.id} post={post} isFirstInGroup={isFirstInGroup} />
              );
            })}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </Box>

      {/* Input Area - Sticky at bottom */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Message..."
            value={newPostText}
            onChange={(e) => setNewPostText(e.target.value)}
            onKeyPress={handleKeyPress}
            variant="outlined"
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.default',
                borderRadius: 3,
              },
            }}
          />
          <IconButton
            color="primary"
            onClick={handleCreatePost}
            disabled={!newPostText.trim() || isSubmitting}
            sx={{
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark',
              },
              '&:disabled': {
                backgroundColor: 'action.disabledBackground',
              },
            }}
          >
            {isSubmitting ? <CircularProgress size={20} /> : <Send />}
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default FeedSection;
