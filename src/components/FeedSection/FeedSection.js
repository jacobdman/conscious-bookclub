import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Paper,
  Fab,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Send, KeyboardArrowDown, Image as ImageIcon, Close, AlternateEmail } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useFeedContext from 'contexts/Feed';
import PostCard from 'components/PostCard';
import MentionInput from 'components/MentionInput';
import { uploadPostImages } from 'services/storage';
import { encodeMentions } from 'utils/mentionHelpers';

const FeedSection = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const { posts, loading, loadingMore, error, createPost, hasMore, loadMorePosts } = useFeedContext();
  const [newPostText, setNewPostText] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // { file, preview }
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [mentions, setMentions] = useState([]); // Track mentions in the post
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const justLoadedMoreRef = useRef(false); // Track if we just loaded older posts
  const previousFirstPostIdRef = useRef(null); // Track first post ID to detect new posts
  const MAX_IMAGES = 5;
  const MAX_IMAGE_SIZE_MB = 5;
  const hasContent = newPostText.trim().length > 0 || selectedFiles.length > 0;

  useEffect(() => {
    return () => {
      selectedFiles.forEach(({ preview }) => URL.revokeObjectURL(preview));
    };
  }, [selectedFiles]);

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

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - selectedFiles.length;
    if (remainingSlots <= 0) {
      setUploadError(`You can attach up to ${MAX_IMAGES} images`);
      return;
    }

    const validFiles = files
      .filter((file) => file.type?.startsWith('image/'))
      .slice(0, remainingSlots);

    const oversized = validFiles.find((file) => file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024);
    if (oversized) {
      setUploadError(`Images must be under ${MAX_IMAGE_SIZE_MB}MB`);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const filesWithPreview = validFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedFiles((prev) => [...prev, ...filesWithPreview]);
    setUploadError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => {
      const fileToRemove = prev[index];
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreatePost = async () => {
    if ((!newPostText.trim() && selectedFiles.length === 0) || isSubmitting) return;
    if (!user || !currentClub) {
      setUploadError('You must be signed in to post');
      return;
    }

    try {
      setIsSubmitting(true);
      setUploadError(null);
      let imageUrls = [];

      if (selectedFiles.length > 0) {
        setUploadingImages(true);
        imageUrls = await uploadPostImages(
          currentClub?.id,
          user?.uid,
          selectedFiles.map(({ file }) => file),
          { maxCount: MAX_IMAGES, maxSizeMb: MAX_IMAGE_SIZE_MB },
        );
      }

      // Encode mentions in the text
      const textWithMentions = encodeMentions(newPostText.trim(), mentions);

      await createPost({ 
        text: textWithMentions, 
        isSpoiler, 
        images: imageUrls,
      });
      
      setNewPostText('');
      setIsSpoiler(false);
      setMentions([]);
      selectedFiles.forEach(({ preview }) => URL.revokeObjectURL(preview));
      setSelectedFiles([]);
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error creating post:', err);
      setUploadError(err.message || 'Failed to create post');
    } finally {
      setIsSubmitting(false);
      setUploadingImages(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && hasContent) {
      e.preventDefault();
      handleCreatePost();
    }
  };

  const handleMentionsChange = useCallback((newMentions) => {
    setMentions(newMentions);
  }, []);

  const handleInsertMention = () => {
    if (!inputRef.current) return;
    
    const input = inputRef.current;
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const textBefore = newPostText.slice(0, start);
    const textAfter = newPostText.slice(end);
    
    // Insert @ at cursor position
    const newText = textBefore + '@' + textAfter;
    setNewPostText(newText);
    
    // Focus and set cursor after @
    setTimeout(() => {
      if (input) {
        const newCursorPos = start + 1;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();
        
        // Trigger input event to activate mention dropdown
        const event = new Event('input', { bubbles: true });
        input.dispatchEvent(event);
      }
    }, 0);
  };

  const postsContent = useMemo(() => {
    return (
      <>
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
              const currentTimestamp = post?.created_at || post?.createdAt;
              const prevTimestamp = prevPost?.created_at || prevPost?.createdAt;
              const isDayBreak = (() => {
                if (!prevTimestamp || !currentTimestamp) return false;
                const currentDate = new Date(currentTimestamp);
                const previousDate = new Date(prevTimestamp);
                if (Number.isNaN(currentDate.getTime()) || Number.isNaN(previousDate.getTime())) return false;
                const diffMs = Math.abs(currentDate.getTime() - previousDate.getTime());
                const oneDayMs = 24 * 60 * 60 * 1000;
                return diffMs > oneDayMs;
              })();
              const isFirstInGroup = index === 0 || prevAuthorId !== currentAuthorId || isDayBreak;
              return (
                <PostCard key={post.id} post={post} isFirstInGroup={isFirstInGroup} />
              );
            })}
            <div ref={messagesEndRef} />
          </Box>
        )}
      </>
    );
  }, [error, loading, loadingMore, posts]);

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
        {postsContent}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFileChange}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <IconButton
              color="primary"
              onClick={handleFileButtonClick}
              disabled={isSubmitting}
              sx={{
                backgroundColor: 'action.selected',
                '&:hover': { backgroundColor: 'action.hover' },
              }}
            >
              <ImageIcon />
            </IconButton>
            <MentionInput
              inputRef={inputRef}
              value={newPostText}
              onChange={(e) => setNewPostText(e.target.value)}
              onMentionsChange={handleMentionsChange}
              onKeyPress={handleKeyPress}
              placeholder="Message..."
              multiline
              maxRows={4}
              disabled={isSubmitting}
              sx={{
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.paper',
                  borderRadius: 3,
                },
              }}
            />
            <IconButton
              color="primary"
            onClick={handleCreatePost}
            disabled={!hasContent || isSubmitting}
              sx={{
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
                '&:disabled': {
                  backgroundColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? theme.palette.action.selected
                      : theme.palette.action.disabledBackground,
                  color: 'action.disabled',
                },
              }}
            >
              {isSubmitting ? <CircularProgress size={20} /> : <Send />}
            </IconButton>
          </Box>
          {selectedFiles.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              {selectedFiles.map(({ preview, file }, index) => (
                <Box
                  key={preview}
                  sx={{
                    position: 'relative',
                    width: 88,
                    height: 88,
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider',
                    backgroundColor: 'background.default',
                  }}
                >
                  <Box
                    component="img"
                    src={preview}
                    alt={file.name}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      backgroundColor: (theme) =>
                        alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.6 : 0.45),
                      color: 'common.white',
                      '&:hover': {
                        backgroundColor: (theme) =>
                          alpha(theme.palette.common.black, theme.palette.mode === 'dark' ? 0.75 : 0.6),
                      },
                    }}
                  >
                    <Close fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          {uploadError && (
            <Typography variant="caption" color="error" sx={{ ml: 0.5 }}>
              {uploadError}
            </Typography>
          )}
          {uploadingImages && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              Uploading images...
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
            <IconButton
              size="small"
              onClick={handleInsertMention}
              disabled={isSubmitting}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  backgroundColor: 'action.hover',
                },
              }}
              title="Mention someone"
            >
              <AlternateEmail fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>
              </Box>
  );
};

export default FeedSection;
