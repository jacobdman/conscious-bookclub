import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getPosts, createPost as createPostService, addReaction as addReactionService, removeReaction as removeReactionService } from 'services/posts/posts.service';
import { connectSocket, disconnectSocket, joinClubRoom, leaveClubRoom, getSocket } from 'services/socket';
import { getReadStatus, markAsRead as markAsReadService } from 'services/feed/feed.service';
import { setBadge, clearBadge } from 'services/badge';
import FeedContext from './FeedContext';

// ******************STATE VALUES**********************
const FeedProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [lastReadTimestamp, setLastReadTimestamp] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [oldestPostId, setOldestPostId] = useState(null);
  const postRefs = useRef({});
  const lastReadTimestampRef = useRef(null);

  // ******************LOAD FUNCTIONS**********************
  const fetchPosts = useCallback(async () => {
    if (!currentClub || !user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch initial 25 posts and read status in parallel
      const [postsResponse, readStatusData] = await Promise.all([
        getPosts(currentClub.id, { limit: 25 }),
        getReadStatus(currentClub.id, user.uid).catch(() => ({ lastReadAt: null })),
      ]);
      
      // Handle both old format (array) and new format (object with posts, hasMore)
      const postsData = Array.isArray(postsResponse) ? postsResponse : (postsResponse.posts || []);
      const hasMorePosts = Array.isArray(postsResponse) ? false : (postsResponse.hasMore || false);
      const nextBeforeId = Array.isArray(postsResponse) ? null : (postsResponse.nextBeforeId || null);
      
      // Ensure postsData is always an array
      setPosts(Array.isArray(postsData) ? postsData : []);
      setHasMore(hasMorePosts);
      setOldestPostId(nextBeforeId);
      
      // Update last read timestamp from API
      const lastReadAt = readStatusData?.lastReadAt 
        ? new Date(readStatusData.lastReadAt) 
        : null;
      setLastReadTimestamp(lastReadAt);
      
      // Try to get from localStorage cache as fallback
      const cacheKey = `feedLastRead_${currentClub.id}_${user.uid}`;
      const cachedTimestamp = localStorage.getItem(cacheKey);
      if (cachedTimestamp && (!lastReadAt || new Date(cachedTimestamp) > lastReadAt)) {
        setLastReadTimestamp(new Date(cachedTimestamp));
      }
      
      // Calculate unread count
      const lastRead = lastReadAt || (cachedTimestamp ? new Date(cachedTimestamp) : null);
      if (lastRead) {
        const unread = postsData.filter(post => {
          const postDate = new Date(post.created_at);
          return postDate > lastRead;
        }).length;
        setUnreadCount(unread);
      } else {
        // If never read, all posts are unread
        setUnreadCount(postsData.length);
      }
    } catch (err) {
      setError('Failed to fetch posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentClub, user]);

  // Load more posts (older posts) when scrolling to top
  const loadMorePosts = useCallback(async () => {
    if (!currentClub || !user || !hasMore || loadingMore || !oldestPostId) return;

    try {
      setLoadingMore(true);
      
      // Fetch older posts
      const postsResponse = await getPosts(currentClub.id, {
        limit: 25,
        beforeId: oldestPostId,
      });
      
      const newPosts = postsResponse.posts || [];
      const hasMorePosts = postsResponse.hasMore || false;
      const nextBeforeId = postsResponse.nextBeforeId || null;
      
      // Append older posts to the end of the array (they're older, so go at the end)
      setPosts(prev => [...prev, ...newPosts]);
      setHasMore(hasMorePosts);
      setOldestPostId(nextBeforeId);
    } catch (err) {
      console.error('Error loading more posts:', err);
      // Don't set error state - just log it, user can try again
    } finally {
      setLoadingMore(false);
    }
  }, [currentClub, user, hasMore, loadingMore, oldestPostId]);

  // ******************EFFECTS/REACTIONS**********************
  // Keep ref in sync with lastReadTimestamp state
  useEffect(() => {
    lastReadTimestampRef.current = lastReadTimestamp;
  }, [lastReadTimestamp]);

  // Socket.io connection and room management
  const socketRef = useRef(null);
  const eventHandlersRef = useRef({});
  const processedPostIdsRef = useRef(new Set()); // Track recently processed post IDs to prevent duplicates

  useEffect(() => {
    if (!user || !currentClub) return;

    const setupSocket = async () => {
      try {
        const socket = await connectSocket();
        socketRef.current = socket;
        
        // Join club room
        joinClubRoom(currentClub.id);

        // Create event handlers (store them so we can remove them later)
        const handlePostCreated = (postData) => {
          const postId = postData.id?.toString();
          
          // Check if we've already processed this post ID (prevent duplicate processing)
          if (processedPostIdsRef.current.has(postId)) {
            console.log(`[FeedProvider] Ignoring duplicate post:created event for post ${postId}`);
            return; // Already processed this post, ignore duplicate event
          }
          
          console.log(`[FeedProvider] Processing post:created event for post ${postId}`);
          
          // Mark this post as processed
          processedPostIdsRef.current.add(postId);
          
          // Clean up old processed IDs after 5 seconds to prevent memory leak
          setTimeout(() => {
            processedPostIdsRef.current.delete(postId);
          }, 5000);
          
          // Check if post already exists in state before processing
          setPosts(prev => {
            // Double-check if post already exists in state (avoid duplicates)
            // Use strict comparison to handle both number and string IDs
            const existingPost = prev.find(p => {
              const prevId = p.id?.toString();
              return prevId === postId;
            });
            
            if (existingPost) {
              // Post already exists in state, don't add duplicate
              return prev;
            }
            
            // Post is new, add it
            return [postData, ...prev];
          });
          
          // Update unread count separately, only if post is newer than last read
          // This ensures it only happens once per post
          const lastRead = lastReadTimestampRef.current;
          if (!lastRead) {
            setUnreadCount(prevCount => {
              console.log(`[FeedProvider] Incrementing unread count (no lastRead): ${prevCount} -> ${prevCount + 1}`);
              return prevCount + 1;
            });
          } else {
            const postDate = new Date(postData.created_at);
            if (postDate > lastRead) {
              setUnreadCount(prevCount => {
                console.log(`[FeedProvider] Incrementing unread count (post newer than lastRead): ${prevCount} -> ${prevCount + 1}`);
                return prevCount + 1;
              });
            }
          }
        };

        const handleReactionAdded = (data) => {
          setPosts(prev => prev.map(post => {
            if (post.id === data.postId) {
              return {
                ...post,
                reactions: data.reactions,
              };
            }
            return post;
          }));
        };

        const handleReactionRemoved = (data) => {
          setPosts(prev => prev.map(post => {
            if (post.id === data.postId) {
              return {
                ...post,
                reactions: data.reactions,
              };
            }
            return post;
          }));
        };

        // Remove any existing listeners first to prevent duplicates
        if (eventHandlersRef.current['post:created']) {
          socket.off('post:created', eventHandlersRef.current['post:created']);
        }
        if (eventHandlersRef.current['reaction:added']) {
          socket.off('reaction:added', eventHandlersRef.current['reaction:added']);
        }
        if (eventHandlersRef.current['reaction:removed']) {
          socket.off('reaction:removed', eventHandlersRef.current['reaction:removed']);
        }

        // Store handlers for cleanup
        eventHandlersRef.current = {
          'post:created': handlePostCreated,
          'reaction:added': handleReactionAdded,
          'reaction:removed': handleReactionRemoved,
        };

        // Register event listeners
        socket.on('post:created', handlePostCreated);
        socket.on('reaction:added', handleReactionAdded);
        socket.on('reaction:removed', handleReactionRemoved);
      } catch (err) {
        console.error('Error setting up socket:', err);
        socketRef.current = null;
      }
    };

    setupSocket();

    return () => {
      // Cleanup: remove all event listeners and disconnect
      const socket = socketRef.current;
      if (socket) {
        // Remove all event listeners
        Object.entries(eventHandlersRef.current).forEach(([event, handler]) => {
          socket.off(event, handler);
        });
        eventHandlersRef.current = {};
        
        // Leave club room and disconnect
        if (currentClub) {
          leaveClubRoom(currentClub.id);
        }
        
        // Note: We don't call disconnectSocket() here because the socket service
        // manages the global socket instance. We just clean up our listeners.
        socketRef.current = null;
      }
    };
  }, [user, currentClub]); // Removed lastReadTimestamp from dependencies

  // Initial load and reset when club changes
  useEffect(() => {
    // Reset state when club changes
    setPosts([]);
    setLastReadTimestamp(null);
    setUnreadCount(0);
    setError(null);
    setHasMore(false);
    setOldestPostId(null);
    // Fetch posts for new club
    fetchPosts();
  }, [fetchPosts]);

  // ******************SETTERS**********************
  const createPost = useCallback(async (postData) => {
    if (!user || !currentClub) return;

    try {
      const newPost = await createPostService(currentClub.id, {
        ...postData,
        authorId: user.uid,
        authorName: user.displayName || user.email,
      });
      
      // Socket.io will handle adding to state via event
      // No need for optimistic update - Socket.io event will arrive immediately
      
      return newPost;
    } catch (err) {
      setError('Failed to create post');
      console.error('Error creating post:', err);
      throw err;
    }
  }, [user, currentClub]);

  const createReply = useCallback(async (parentPostId, replyData) => {
    if (!user || !currentClub) return;

    try {
      const newReply = await createPostService(currentClub.id, {
        ...replyData,
        authorId: user.uid,
        authorName: user.displayName || user.email,
        parentPostId,
      });
      
      // Socket.io will handle adding to state via event
      // No need for optimistic update - Socket.io event will arrive immediately
      
      return newReply;
    } catch (err) {
      setError('Failed to create reply');
      console.error('Error creating reply:', err);
      throw err;
    }
  }, [user, currentClub]);

  const addReaction = useCallback(async (postId, emoji) => {
    if (!user || !currentClub) return;

    // Optimistically update local state
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const existingReactions = post.reactions || [];
        // Check if user already has this reaction (shouldn't happen, but just in case)
        const hasReaction = existingReactions.some(r => r.userId === user.uid && r.emoji === emoji);
        if (hasReaction) {
          return post; // Already reacted, don't add duplicate
        }
        // Add new reaction optimistically
        const newReaction = {
          id: Date.now(), // Temporary ID
          postId,
          userId: user.uid,
          emoji,
          user: {
            uid: user.uid,
            displayName: user.displayName,
            photoUrl: user.photoURL,
          },
          created_at: new Date().toISOString(),
        };
        return {
          ...post,
          reactions: [...existingReactions, newReaction],
        };
      }
      return post;
    }));

    try {
      await addReactionService(currentClub.id, postId, emoji, user.uid);
      // Socket.io will handle updating state with server data, but local update is already done
    } catch (err) {
      // Revert optimistic update on error
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const existingReactions = post.reactions || [];
          // Remove the temporary reaction (has temp ID or matches user/emoji without a real ID)
          return {
            ...post,
            reactions: existingReactions.filter(r => {
              // Keep reactions that don't match this user/emoji combo, or have a real ID (not temp)
              return !(r.userId === user.uid && r.emoji === emoji && (typeof r.id === 'number' && r.id > 1000000000000));
            }),
          };
        }
        return post;
      }));
      setError('Failed to add reaction');
      console.error('Error adding reaction:', err);
      throw err;
    }
  }, [user, currentClub]);

  const removeReaction = useCallback(async (postId, emoji) => {
    if (!user || !currentClub) return;

    // Optimistically update local state
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const existingReactions = post.reactions || [];
        return {
          ...post,
          reactions: existingReactions.filter(r => !(r.userId === user.uid && r.emoji === emoji)),
        };
      }
      return post;
    }));

    try {
      await removeReactionService(currentClub.id, postId, emoji, user.uid);
      // Socket.io will handle updating state with server data, but local update is already done
    } catch (err) {
      // On error, we'd need to refetch, but for now just show error
      // In a production app, you might want to refetch the post's reactions
      setError('Failed to remove reaction');
      console.error('Error removing reaction:', err);
      // Refetch posts to get correct state
      fetchPosts();
      throw err;
    }
  }, [user, currentClub, fetchPosts]);

  // ******************UTILITY FUNCTIONS**********************
  const scrollToPost = useCallback((postId) => {
    const postElement = postRefs.current[postId];
    if (postElement) {
      postElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Highlight briefly
      postElement.style.transition = 'background-color 0.3s';
      postElement.style.backgroundColor = 'rgba(25, 118, 210, 0.1)';
      setTimeout(() => {
        postElement.style.backgroundColor = '';
      }, 2000);
    }
  }, []);

  const registerPostRef = useCallback((postId, element) => {
    if (element) {
      postRefs.current[postId] = element;
    } else {
      delete postRefs.current[postId];
    }
  }, []);

  const markAsRead = useCallback(async (timestamp = null) => {
    if (!user || !currentClub) return;

    const readTimestamp = timestamp || new Date();

    try {
      // Update database
      await markAsReadService(currentClub.id, user.uid, readTimestamp);
      
      // Update local state
      setLastReadTimestamp(readTimestamp);
      
      // Update localStorage cache
      const cacheKey = `feedLastRead_${currentClub.id}_${user.uid}`;
      localStorage.setItem(cacheKey, readTimestamp.toISOString());
      
      // Recalculate unread count
      // Safety check: ensure posts is an array
      const unread = Array.isArray(posts) 
        ? posts.filter(post => {
            const postDate = new Date(post.created_at);
            return postDate > readTimestamp;
          }).length
        : 0;
      setUnreadCount(unread);
    } catch (err) {
      console.error('Error marking feed as read:', err);
      // Still update local cache even if API fails
      const cacheKey = `feedLastRead_${currentClub.id}_${user.uid}`;
      localStorage.setItem(cacheKey, readTimestamp.toISOString());
      setLastReadTimestamp(readTimestamp);
    }
  }, [user, currentClub, posts]);

  // Update PWA badge when unreadCount changes
  useEffect(() => {
    if (unreadCount > 0) {
      setBadge(unreadCount);
    } else {
      clearBadge();
    }
  }, [unreadCount]);

  // ******************EXPORTS**********************
  return (
    <FeedContext.Provider
      value={{
        posts,
        loading,
        loadingMore,
        error,
        unreadCount,
        lastReadTimestamp,
        hasMore,
        fetchPosts,
        loadMorePosts,
        createPost,
        createReply,
        addReaction,
        removeReaction,
        markAsRead,
        scrollToPost,
        registerPostRef,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};

export default FeedProvider;

