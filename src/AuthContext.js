import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  getRedirectResult,
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { createUserDocument } from './services/users/users.service';
import { signInWithApple, signInWithEmail, signUpWithEmail } from './services/authService';
import { isNativeApp } from 'utils/platformHelpers';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = (props) => {
  const children = props?.children;
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const signInWithGoogle = async () => {
    if (isNativeApp()) {
      const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
      const nativeResult = await FirebaseAuthentication.signInWithGoogle();
      const idToken = nativeResult.credential?.idToken;
      if (!idToken) throw new Error('Google Sign-In did not return an ID token.');
      const { signInWithCredential, GoogleAuthProvider } = await import('firebase/auth');
      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      return result.user;
    }
    if (!googleProvider) {
      throw new Error(
        'Google Sign-In is not available. Please sign in with email.'
      );
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      throw error;
    }
  };

  const signInWithAppleProvider = async () => signInWithApple();

  const logout = async () => {
    try {
      if (isNativeApp()) {
        const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
        await FirebaseAuthentication.signOut();
      }
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  useEffect(() => {
    // Skip redirect result on native: it triggers cross-origin requests to Google
    // that are blocked by CORS (origin capacitor://localhost). Redirect-based auth
    // is not used in the Capacitor app.
    if (!isNativeApp()) {
      getRedirectResult(auth)
        .then((result) => {
          if (result && result.user) {
            createUserDocument(result.user)
              .then((createdUser) => {
                setUserProfile(createdUser);
              })
              .catch(() => {});
          }
        })
        .catch((error) => {
          const errorMessage = error.message || '';
          const isMissingStateError =
            error.code === 'auth/missing-or-invalid-nonce' ||
            error.code === 'auth/argument-error' ||
            errorMessage.includes('missing initial state') ||
            errorMessage.includes('sessionStorage');
          if (!isMissingStateError) {
            console.error('Error processing redirect result:', error);
          }
        });
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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

    // Safety: if onAuthStateChanged never fires (e.g. CORS blocks Firebase on native),
    // stop loading after 5s so the app shows login instead of spinning forever.
    const timeoutId = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const value = {
    user,
    userProfile,
    setUserProfile,
    loading,
    signInWithGoogle,
    signInWithApple: signInWithAppleProvider,
    signInWithEmail,
    signUpWithEmail,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
