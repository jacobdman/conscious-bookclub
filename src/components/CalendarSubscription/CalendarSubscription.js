import React, { useState } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import { ContentCopy, CheckCircle } from '@mui/icons-material';
import useClubContext from 'contexts/Club';

// Get API base URL (same logic as apiHelpers)
const getApiBase = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (isDevelopment) {
    return 'http://localhost:5001/conscious-bookclub-87073-9eb71/us-central1/api';
  }
  return 'https://us-central1-conscious-bookclub-87073-9eb71.cloudfunctions.net/api';
};

const CalendarSubscription = () => {
  const { currentClub } = useClubContext();
  const [icalUrlCopied, setIcalUrlCopied] = useState(false);

  const getICalUrl = () => {
    if (!currentClub) return '';
    const apiBase = getApiBase();
    return `${apiBase}/v1/meetings/${currentClub.id}/ical`;
  };

  const handleCopyICalUrl = () => {
    if (!currentClub) return;
    const icalUrl = getICalUrl();
    navigator.clipboard.writeText(icalUrl).then(() => {
      setIcalUrlCopied(true);
      setTimeout(() => setIcalUrlCopied(false), 2000);
    });
  };

  if (!currentClub) return null;

  return (
    <Paper 
      sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: 'primary.light',
        color: 'primary.contrastText'
      }}
    >
      <Typography 
        variant="h6" 
        sx={{ mb: 1, color: 'inherit' }}
      >
        Calendar Subscription
      </Typography>
      <Typography 
        variant="body2" 
        sx={{ 
          mb: 2, 
          color: 'inherit', 
          opacity: 0.9 
        }}
      >
        Copy the link below and add it to your calendar app (Google Calendar, Outlook, Apple Calendar, etc.) to automatically sync meetings.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          value={getICalUrl()}
          fullWidth
          size="small"
          InputProps={{
            readOnly: true,
            sx: { bgcolor: 'background.paper', color: 'text.primary' },
          }}
        />
        <Tooltip title={icalUrlCopied ? 'Copied!' : 'Copy URL'}>
          <IconButton
            onClick={handleCopyICalUrl}
            sx={{
              bgcolor: 'background.paper',
              color: 'primary.main',
              '&:hover': {
                bgcolor: 'background.paper',
                opacity: 0.8
              }
            }}
            size="small"
          >
            {icalUrlCopied ? <CheckCircle /> : <ContentCopy />}
          </IconButton>
        </Tooltip>
      </Box>
    </Paper>
  );
};

export default CalendarSubscription;

