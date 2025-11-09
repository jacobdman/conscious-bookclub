import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getPosts, createPost as createPostService, addReaction as addReactionService, removeReaction as removeReactionService } from 'services/posts/posts.service';
import { connectSocket, disconnectSocket, joinClubRoom, leaveClubRoom, getSocket } from 'services/socket';
import FeedContext from './FeedContext';

// ******************STATE VALUES**********************
const FeedProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const postRefs = useRef({});

  // ******************LOAD FUNCTIONS**********************
  const fetchPosts = useCallback(async () => {
    if (!currentClub) return;

    try {
      setLoading(true);
      setError(null);
      const postsData = await getPosts(currentClub.id);
      setPosts(postsData);
    } catch (err) {
      setError('Failed to fetch posts');
      console.error('Error fetching posts:', err);
    } finally {
      setLoading(false);
    }
  }, [currentClub]);

  // ******************EFFECTS/REACTIONS**********************
  // Socket.io connection and room management
  useEffect(() => {
    if (!user || !currentClub) return;

    let socket = null;

    const setupSocket = async () => {
      try {
        socket = await connectSocket();
        joinClubRoom(currentClub.id);

        // Listen for new posts
        socket.on('post:created', (postData) => {
          setPosts(prev => {
            // Check if post already exists (avoid duplicates)
            if (prev.find(p => p.id === postData.id)) {
              return prev;
            }
            return [postData, ...prev];
          });
        });

        // Listen for reaction updates
        socket.on('reaction:added', (data) => {
          setPosts(prev => prev.map(post => {
            if (post.id === data.postId) {
              return {
                ...post,
                reactions: data.reactions,
              };
            }
            return post;
          }));
        });

        socket.on('reaction:removed', (data) => {
          setPosts(prev => prev.map(post => {
            if (post.id === data.postId) {
              return {
                ...post,
                reactions: data.reactions,
              };
            }
            return post;
          }));
        });
      } catch (err) {
        console.error('Error setting up socket:', err);
      }
    };

    setupSocket();

    return () => {
      if (socket && currentClub) {
        leaveClubRoom(currentClub.id);
      }
    };
  }, [user, currentClub]);

  // Initial load
  useEffect(() => {
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
      // But we can optimistically add it
      setPosts(prev => [newPost, ...prev]);
      
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
      setPosts(prev => [newReply, ...prev]);
      
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

  // ******************EXPORTS**********************
  return (
    <FeedContext.Provider
      value={{
        posts,
        loading,
        error,
        fetchPosts,
        createPost,
        createReply,
        addReaction,
        removeReaction,
        scrollToPost,
        registerPostRef,
      }}
    >
      {children}
    </FeedContext.Provider>
  );
};

export default FeedProvider;

