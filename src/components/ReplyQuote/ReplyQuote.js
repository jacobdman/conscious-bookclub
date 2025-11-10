import React from 'react';
import { Box, Typography } from '@mui/material';
import useFeedContext from 'contexts/Feed';

const ReplyQuote = ({ parentPostText, parentPostId, parentAuthorName }) => {
  const { scrollToPost } = useFeedContext();

  const handleClick = () => {
    if (parentPostId) {
      scrollToPost(parentPostId);
    }
  };

  return (
    <Box
      onClick={handleClick}
      sx={{
        borderLeft: '2px solid',
        borderColor: 'primary.main',
        backgroundColor: 'action.hover',
        padding: '6px 10px',
        marginBottom: 0.75,
        borderRadius: '0 4px 4px 0',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        '&:hover': {
          backgroundColor: 'action.selected',
        },
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 600,
          fontSize: '0.75rem',
          color: 'primary.main',
          display: 'block',
          mb: 0.25,
        }}
      >
        {parentAuthorName}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          fontSize: '0.8125rem',
          color: 'text.secondary',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {parentPostText}
      </Typography>
    </Box>
  );
};

export default ReplyQuote;

