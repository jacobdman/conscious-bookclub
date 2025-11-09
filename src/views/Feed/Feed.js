import React from 'react';
import { Box } from '@mui/material';
import FeedProvider from 'contexts/Feed/FeedProvider';
import Layout from 'components/Layout';
import FeedSection from 'components/FeedSection';

const Feed = () => {
  return (
    <FeedProvider>
      <Layout>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          }}
        >
          <FeedSection />
        </Box>
      </Layout>
    </FeedProvider>
  );
};

export default Feed;

