import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Paper,
  Fab,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Send, KeyboardArrowDown } from '@mui/icons-material';
import useFeedContext from 'contexts/Feed';
import PostCard from 'components/PostCard';

const FeedSection = () => {
  const { posts, loading, loadingMore, error, createPost, hasMore, loadMorePosts } = useFeedContext();
  const [newPostText, setNewPostText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const justLoadedMoreRef = useRef(false); // Track if we just loaded older posts
  const previousFirstPostIdRef = useRef(null); // Track first post ID to detect new posts

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when new posts arrive (but not when loading more at top)
  useEffect(() => {
    if (posts.length === 0) {
      previousFirstPostIdRef.current = null;
      return;
    }

    const currentFirstPostId = posts[0]?.id;
    
    // Only auto-scroll if:
    // 1. Not loading initial posts
    // 2. Not currently loading more
    // 3. Didn't just load older posts (flag prevents auto-scroll)
    // 4. First post changed (new posts added at beginning) OR initial load
    if (
      !loading && 
      !loadingMore && 
      !justLoadedMoreRef.current &&
      (previousFirstPostIdRef.current === null || currentFirstPostId !== previousFirstPostIdRef.current)
    ) {
      scrollToBottom();
    }
    
    // Update the tracked first post ID
    previousFirstPostIdRef.current = currentFirstPostId;
    
    // Reset the flag after posts have rendered
    if (justLoadedMoreRef.current) {
      const timer = setTimeout(() => {
        justLoadedMoreRef.current = false;
      }, 300); // Keep flag set longer to prevent auto-scroll
      return () => clearTimeout(timer);
    }
  }, [posts, loading, loadingMore]);

  // Detect scroll to top and load more posts
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || !hasMore) return;

    let isLoading = false; // Prevent multiple simultaneous loads
    let scrollTimeout = null;

    const handleScroll = () => {
      // Debounce scroll events
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(() => {
        // Check if scrolled near the top (within 200px) and not already loading
        if (scrollContainer.scrollTop < 200 && !isLoading && !loadingMore) {
          isLoading = true;
          justLoadedMoreRef.current = true; // Mark that we're loading older posts
          const scrollHeightBefore = scrollContainer.scrollHeight;
          const scrollTopBefore = scrollContainer.scrollTop;
          
          loadMorePosts().then(() => {
            // After loading, preserve scroll position
            // New content is added at the end of array (older posts), which appear at top after reversing
            // So we need to adjust scroll position to account for the new content height
            // Use multiple requestAnimationFrame calls to ensure DOM has fully updated
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const scrollHeightAfter = scrollContainer.scrollHeight;
                const heightDifference = scrollHeightAfter - scrollHeightBefore;
                // Adjust scroll position to keep the same content visible
                // Since older posts are added at the end of array (top after reversing),
                // we add the height difference to maintain position
                if (heightDifference > 0) {
                  scrollContainer.scrollTop = scrollTopBefore + heightDifference;
                }
                isLoading = false;
              });
            });
          }).catch(() => {
            isLoading = false;
            justLoadedMoreRef.current = false;
          });
        }
      }, 100); // 100ms debounce
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [hasMore, loadingMore, loadMorePosts]);

  // Detect scroll position for scroll-to-bottom FAB
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const isNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight < 100;
      setShowScrollToBottom(!isNearBottom);
    };

    // Check initial position
    handleScroll();

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', handleScroll);
    };
  }, [posts]); // Re-check when posts change

  const handleCreatePost = async () => {
    if (!newPostText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createPost({ text: newPostText.trim(), isSpoiler });
      setNewPostText('');
      setIsSpoiler(false);
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
        position: 'relative',
      }}
    >
      {/* Messages Feed - Scrollable */}
      <Box
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Loading More Indicator (at top) */}
        {loadingMore && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}

        {/* Loading State */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3, mt: 'auto' }}>
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

      {/* Scroll-to-bottom FAB */}
      {showScrollToBottom && (
        <Fab
          size="small"
          color="primary"
          onClick={scrollToBottom}
          sx={{
            position: 'absolute',
            bottom: 80,
            right: 16,
            zIndex: 11,
            transition: 'opacity 0.2s, transform 0.2s',
            '&:hover': {
              transform: 'scale(1.1)',
            },
          }}
          aria-label="Scroll to bottom"
        >
          <KeyboardArrowDown />
        </Fab>
      )}

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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
          <FormControlLabel
            control={
              <Checkbox
                checked={isSpoiler}
                onChange={(e) => setIsSpoiler(e.target.checked)}
                size="small"
              />
            }
            label="Mark as spoiler"
            sx={{ ml: 0.5 }}
          />
        </Box>
      </Paper>
              </Box>
  );
};

export default FeedSection;
