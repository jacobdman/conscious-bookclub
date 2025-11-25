import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Avatar,
  Paper,
  CircularProgress,
  Badge,
  IconButton,
} from '@mui/material';
import { ArrowForward } from '@mui/icons-material';
import useFeedContext from 'contexts/Feed';
import EmojiInput from 'components/EmojiInput';
import ReplyQuote from 'components/ReplyQuote';

const FeedPreview = () => {
  const navigate = useNavigate();
  const { posts, loading, unreadCount } = useFeedContext();
  const [showReactionsMap, setShowReactionsMap] = React.useState({});
  const [revealedSpoilers, setRevealedSpoilers] = React.useState({});
  const [fadingOutSpoilers, setFadingOutSpoilers] = React.useState({});

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

  const handleHeaderClick = () => {
    navigate('/feed');
  };

  return (
    <Box>
      {/* Feed Header */}
      <Box
        onClick={handleHeaderClick}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          backgroundColor: 'background.paper',
          borderRadius: 1,
          mb: 1,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          transition: 'background-color 0.2s',
        }}
      >
        <Typography 
          variant="h6" 
          component="h1" 
          sx={{ 
            display: 'inline-flex', 
            alignItems: 'center',
            fontWeight: 600,
          }}
        >
          {unreadCount > 0 ? (
            <Badge
              badgeContent={unreadCount > 99 ? '99+' : unreadCount}
              color="error"
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.7rem',
                  minWidth: '18px',
                  height: '18px',
                  padding: '0 4px',
                  top: -4,
                  right: -8,
                },
              }}
            >
              <span>Feed</span>
            </Badge>
          ) : (
            'Feed'
          )}
        </Typography>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/feed');
          }}
          sx={{
            color: 'text.secondary',
            '&:hover': {
              color: 'primary.main',
              backgroundColor: 'action.selected',
            },
          }}
          aria-label="View full feed"
        >
          <ArrowForward fontSize="small" />
        </IconButton>
      </Box>

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
                  {post.parentPostId && post.parentPost && (
                    <Box sx={{ mb: 0.5 }}>
                      <ReplyQuote
                        parentAuthorName={post.parentPost.authorName || post.parentPost.author?.displayName || 'Unknown'}
                        parentPostText={post.parentPost.text}
                        parentIsSpoiler={post.parentIsSpoiler}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Navigate to feed and scroll to parent post
                          navigate('/feed');
                        }}
                      />
                    </Box>
                  )}

                  {/* Message text */}
                  {post.isSpoiler && !revealedSpoilers[post.id] ? (
                    <Box
                      onClick={() => {
                        setFadingOutSpoilers(prev => ({ ...prev, [post.id]: true }));
                        setTimeout(() => {
                          setRevealedSpoilers(prev => ({ ...prev, [post.id]: true }));
                          setFadingOutSpoilers(prev => {
                            const next = { ...prev };
                            delete next[post.id];
                            return next;
                          });
                        }, 300);
                      }}
                      sx={{
                        cursor: 'pointer',
                        mb: 0.5,
                        userSelect: 'none',
                        backgroundColor: 'action.hover',
                        borderRadius: 1.5,
                        px: 1.5,
                        py: 2,
                        border: '1px solid',
                        borderColor: 'divider',
                        transition: 'all 0.3s ease',
                        opacity: fadingOutSpoilers[post.id] ? 0 : 1,
                        transform: fadingOutSpoilers[post.id] ? 'scale(0.98)' : 'scale(1)',
                        pointerEvents: fadingOutSpoilers[post.id] ? 'none' : 'auto',
                        '&:hover': {
                          backgroundColor: 'action.selected',
                          borderColor: 'primary.main',
                        },
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          fontWeight: 500,
                          textAlign: 'center',
                          mb: 0.25,
                          display: 'block',
                          fontSize: '0.75rem',
                        }}
                      >
                        Spoiler
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: 'text.secondary',
                          textAlign: 'center',
                          display: 'block',
                          fontSize: '0.7rem',
                        }}
                      >
                        Click to reveal
                      </Typography>
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ mb: 0.5, wordBreak: 'break-word' }}>
                      {post.text}
                    </Typography>
                  )}

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
    </Paper>
    </Box>
  );
};

export default FeedPreview;

