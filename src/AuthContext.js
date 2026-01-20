import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  getRedirectResult 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { createUserDocument } from './services/users/users.service';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    // Clear any pending redirect results on app initialization
    // This prevents "missing initial state" errors
    getRedirectResult(auth)
      .then((result) => {
        // If there's a redirect result, handle it
        if (result && result.user) {
          // User signed in via redirect
          createUserDocument(result.user)
            .then((createdUser) => {
              setUserProfile(createdUser);
            })
            .catch(() => {
              // Error creating user document
            });
        }
      })
      .catch((error) => {
        // Ignore errors about missing state - this is expected if no redirect was initiated
        // Common error codes: 'auth/missing-or-invalid-nonce', 'auth/argument-error'
        // The error message typically contains "missing initial state" or "sessionStorage"
        const errorMessage = error.message || '';
        const isMissingStateError = 
          error.code === 'auth/missing-or-invalid-nonce' ||
          error.code === 'auth/argument-error' ||
          errorMessage.includes('missing initial state') ||
          errorMessage.includes('sessionStorage');
        
        if (!isMissingStateError) {
          console.error('Error processing redirect result:', error);
        }
        // Silently ignore missing state errors - they're harmless
      });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Create or update user document
        try {
          const createdUser = await createUserDocument(user);
          setUserProfile(createdUser);
        } catch (error) {
          // Error creating user document
        }
      } else {
        setUserProfile(null);
      }
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    setUserProfile,
    loading,
    signInWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
