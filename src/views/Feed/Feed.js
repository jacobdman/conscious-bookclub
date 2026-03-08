import React, { useEffect } from 'react';
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
    <Layout>
      <FeedContent />
    </Layout>
  );
};

export default Feed;

