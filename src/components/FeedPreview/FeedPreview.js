import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  Badge,
  CircularProgress,
} from '@mui/material';
import useFeedContext from 'contexts/Feed';
import EmojiInput from 'components/EmojiInput';
import ReplyQuote from 'components/ReplyQuote';

const FeedPreview = () => {
  const navigate = useNavigate();
  const { posts, loading, unreadCount } = useFeedContext();
  const [showReactionsMap, setShowReactionsMap] = React.useState({});

  // Get latest 3 posts (they're already sorted newest first)
  // Reverse so latest appears at bottom
  const latestPosts = posts.slice(0, 3).reverse();

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (err) {
      return '';
    }
  };

  const handleClick = (e) => {
    // Don't navigate if clicking on emoji reactions or their popovers
    const target = e.target;
    const isEmojiClick = target.closest('[data-emoji-reaction]') || 
                         target.closest('.MuiPopover-root') ||
                         target.closest('.MuiChip-root') ||
                         target.closest('.MuiPopover-paper') ||
                         target.closest('button[aria-label*="emoji"]');
    
    if (!isEmojiClick) {
      navigate('/feed');
    }
  };

  return (
    <Paper
      elevation={1}
      onClick={handleClick}
      sx={{
        cursor: 'pointer',
        p: 2,
        '&:hover': {
          boxShadow: 3,
        },
        transition: 'box-shadow 0.2s',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Feed
        </Typography>
        {unreadCount > 0 && (
          <Badge badgeContent={unreadCount} color="error">
            <Box sx={{ width: 8, height: 8 }} />
          </Badge>
        )}
      </Box>

      {loading && posts.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={24} />
        </Box>
      ) : latestPosts.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
          No messages yet. Start the conversation!
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {latestPosts.map((post, index) => {
            const prevPost = latestPosts[index - 1];
            const currentAuthorId = post.authorId || post.author?.uid;
            const prevAuthorId = prevPost?.authorId || prevPost?.author?.uid;
            const isFirstInGroup = index === 0 || prevAuthorId !== currentAuthorId;
            const authorName = post.authorName || post.author?.displayName || 'Unknown';

            return (
              <Box
                key={post.id}
                onMouseEnter={() => {
                  setShowReactionsMap(prev => ({ ...prev, [post.id]: true }));
                }}
                onMouseLeave={() => {
                  // Always hide reactions on mouse leave (desktop behavior)
                  setShowReactionsMap(prev => ({ ...prev, [post.id]: false }));
                }}
                onClick={(e) => {
                  // On mobile/touch devices, toggle reactions on tap
                  // Only toggle if clicking on the message itself, not on reactions
                  if ('ontouchstart' in window && !e.target.closest('[data-emoji-reaction]')) {
                    setShowReactionsMap(prev => ({ ...prev, [post.id]: !prev[post.id] }));
                  }
                }}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                    borderRadius: 1,
                    mx: -1,
                    px: 1,
                    py: 0.5,
                  },
                  transition: 'background-color 0.2s',
                }}
              >
                {/* Avatar - only show for first message in group */}
                <Box sx={{ flexShrink: 0, width: 32, display: 'flex', justifyContent: 'center' }}>
                  {isFirstInGroup ? (
                    <Avatar
                      src={post.author?.photoUrl}
                      alt={authorName}
                      sx={{ width: 32, height: 32 }}
                    >
                      {authorName.charAt(0).toUpperCase()}
                    </Avatar>
                  ) : (
                    <Box sx={{ width: 32 }} />
                  )}
                </Box>

                {/* Message content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {isFirstInGroup && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {authorName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatTime(post.created_at)}
                      </Typography>
                    </Box>
                  )}

                  {/* Reply quote if this is a reply */}
                  {post.parentPostId && (
                    <Box sx={{ mb: 0.5 }}>
                      <ReplyQuote
                        parentAuthorName={post.parentAuthorName}
                        parentPostText={post.parentPostText}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to feed and scroll to parent post
                          navigate('/feed');
                        }}
                      />
                    </Box>
                  )}

                  {/* Message text */}
                  <Typography variant="body2" sx={{ mb: 0.5, wordBreak: 'break-word' }}>
                    {post.text}
                  </Typography>

                  {/* Emoji reactions - always show existing reactions, only show + button on hover/tap */}
                  <Box
                    data-emoji-reaction
                    onClick={(e) => e.stopPropagation()}
                    sx={{ mt: 0.5 }}
                  >
                    <EmojiInput 
                      postId={post.id} 
                      reactions={post.reactions || []} 
                      showAddButton={showReactionsMap[post.id]}
                    />
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {latestPosts.length > 0 && (
        <Typography
          variant="caption"
          color="primary"
          sx={{
            display: 'block',
            textAlign: 'center',
            mt: 2,
            fontWeight: 500,
          }}
        >
          Click to view full feed →
        </Typography>
      )}
    </Paper>
  );
};

export default FeedPreview;

