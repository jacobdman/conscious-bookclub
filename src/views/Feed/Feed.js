import React, { useEffect } from 'react';
import FeedProvider from 'contexts/Feed/FeedProvider';
import Layout from 'components/Layout';
import FeedSection from 'components/FeedSection';
import useFeedContext from 'contexts/Feed';

const FeedContent = () => {
  const { markAsRead } = useFeedContext();

  useEffect(() => {
    // Mark feed as read when user views the feed
    markAsRead();
  }, [markAsRead]);

  return (
    <FeedSection />
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

