import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  TextField,
  Tooltip,
} from '@mui/material';
import { Reply as ReplyIcon } from '@mui/icons-material';
import ReplyQuote from 'components/ReplyQuote';
import EmojiInput from 'components/EmojiInput';
import useFeedContext from 'contexts/Feed';

const PostCard = ({ post, isFirstInGroup = true }) => {
  const { createReply, registerPostRef } = useFeedContext();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const postRef = useRef(null);

  useEffect(() => {
    if (postRef.current) {
      registerPostRef(post.id, postRef.current);
    }
    return () => {
      registerPostRef(post.id, null);
    };
  }, [post.id, registerPostRef]);

  const handleReplySubmit = async () => {
    if (!replyText.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await createReply(post.id, { text: replyText.trim() });
      setReplyText('');
      setShowReplyForm(false);
    } catch (err) {
      console.error('Error creating reply:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch (err) {
      return '';
    }
  };

  const authorName = post.authorName || post.author?.displayName || 'Unknown';
  const showAvatar = isFirstInGroup;

  return (
    <Box
      ref={postRef}
      onMouseEnter={() => {
        setHovered(true);
        setShowReactions(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
        // Always hide reactions on mouse leave (desktop behavior)
        setShowReactions(false);
      }}
      onClick={(e) => {
        // On mobile/touch devices, toggle reactions on tap
        // Only toggle if clicking on the message itself, not on reactions
        if ('ontouchstart' in window && !e.target.closest('[data-emoji-reaction]')) {
          setShowReactions(prev => !prev);
        }
      }}
      sx={{
        display: 'flex',
        gap: 1.5,
        px: 2,
        py: 0.75,
        '&:hover': {
          backgroundColor: 'action.hover',
        },
        transition: 'background-color 0.2s',
      }}
    >
      {/* Avatar - only show for first message in group */}
      <Box sx={{ flexShrink: 0, width: 40, display: 'flex', justifyContent: 'center' }}>
        {showAvatar ? (
          <Avatar
            src={post.author?.photoUrl}
            alt={authorName}
            sx={{ width: 40, height: 40 }}
          />
        ) : (
          <Box sx={{ width: 40 }} />
        )}
      </Box>

      {/* Message Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Header with name and timestamp - only show for first in group */}
        {showAvatar && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: '0.9375rem',
                color: 'text.primary',
              }}
            >
              {authorName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              {formatTime(post.created_at)}
            </Typography>
          </Box>
        )}

        {/* Reply Quote */}
        {post.parentPostId && post.parentPostText && (
          <Box sx={{ mb: 0.75 }}>
            <ReplyQuote
              parentPostText={post.parentPostText}
              parentPostId={post.parentPostId}
              parentAuthorName={post.parentAuthorName || post.parentAuthor?.displayName || 'Unknown'}
            />
          </Box>
        )}

        {/* Message Text */}
        <Typography
          variant="body1"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.9375rem',
            lineHeight: 1.4,
            color: 'text.primary',
            mb: 0.5,
          }}
        >
          {post.text}
        </Typography>

        {/* Reactions - always show existing reactions, only show + button on hover/tap */}
        <Box 
          sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}
          onClick={(e) => e.stopPropagation()}
        >
          <EmojiInput 
            postId={post.id} 
            reactions={post.reactions || []} 
            showAddButton={showReactions}
          />
          {hovered && (
            <Tooltip title="Reply">
              <IconButton
                size="small"
                onClick={() => setShowReplyForm(!showReplyForm)}
                sx={{
                  opacity: 0.7,
                  '&:hover': { opacity: 1 },
                  padding: '4px',
                }}
              >
                <ReplyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Reply Form */}
        {showReplyForm && (
          <Box sx={{ mt: 1.5, ml: -1, pl: 1, borderLeft: '2px solid', borderColor: 'primary.main' }}>
            <TextField
              fullWidth
              multiline
              rows={2}
              placeholder={`Reply to ${authorName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReplySubmit();
                }
              }}
              size="small"
              autoFocus
              sx={{
                mb: 1,
                '& .MuiOutlinedInput-root': {
                  backgroundColor: 'background.default',
                  borderRadius: 2,
                },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <Typography
                variant="caption"
                onClick={() => {
                  setShowReplyForm(false);
                  setReplyText('');
                }}
                sx={{
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                Cancel
              </Typography>
              <IconButton
                size="small"
                color="primary"
                onClick={handleReplySubmit}
                disabled={!replyText.trim() || isSubmitting}
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
                <ReplyIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PostCard;

