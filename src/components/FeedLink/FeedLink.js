import React, { useState, useEffect } from 'react';
import { Box, Typography, Link } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { getApiBase } from 'services/apiHelpers';
import { getLinkPreview } from 'services/feed/feed.service';

const getPreviewImageSrc = (imageUrl) => {
  if (!imageUrl) return null;
  const base = getApiBase();
  return `${base}/v1/feed/image-proxy?url=${encodeURIComponent(imageUrl)}`;
};

const FeedLink = ({ href, displayText }) => {
  const [preview, setPreview] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setImageError(false);
    getLinkPreview(href)
      .then((data) => {
        if (!cancelled && (data?.title || data?.image)) {
          setPreview({ title: data.title || null, image: data.image || null });
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [href]);

  return (
    <Box
      component="span"
      sx={{
        display: 'block',
        marginTop: 0.5,
        marginBottom: 0.25,
        maxWidth: '100%',
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
          borderRadius: 2,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
          maxWidth: 320,
        }}
      >
        {preview?.image && !imageError && (
          <Box
            component="span"
            sx={{
              display: 'block',
              width: '100%',
              height: 140,
              backgroundColor: 'action.hover',
              '& img': {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                verticalAlign: 'top',
              },
            }}
          >
            <img
              src={getPreviewImageSrc(preview.image)}
              alt=""
              loading="lazy"
              onError={() => setImageError(true)}
            />
          </Box>
        )}
        <Box
          component="span"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.25,
            px: 1.25,
            py: 1,
          }}
        >
          {preview?.title && (
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: 'text.primary',
                lineHeight: 1.3,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {preview.title}
            </Typography>
          )}
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
            sx={{
              fontSize: '0.8125rem',
              color: 'primary.main',
              wordBreak: 'break-all',
            }}
          >
            {displayText}
          </Link>
        </Box>
      </Box>
    </Box>
  );
};

export default FeedLink;
