import React, { useEffect } from 'react';
import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import FeedProvider from 'contexts/Feed/FeedProvider';
import Layout from 'components/Layout';
import FeedSection from 'components/FeedSection';
import useFeedContext from 'contexts/Feed';

const FeedContent = () => {
  const { markAsRead, showActivity, setShowActivity } = useFeedContext();

  useEffect(() => {
    // Mark feed as read when user views the feed
    markAsRead();
  }, [markAsRead]);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        <Typography variant="h6" sx={{ fontSize: '1rem' }}>
          Feed
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={showActivity}
              onChange={(e) => setShowActivity(e.target.checked)}
              color="primary"
            />
          }
          label="Show activity posts"
          sx={{ m: 0 }}
        />
      </Box>
      <FeedSection />
    </Box>
  );
};

const Feed = () => {
  return (
    <FeedProvider>
      <Layout>
        <FeedContent />
      </Layout>
    </FeedProvider>
  );
};

export default Feed;

