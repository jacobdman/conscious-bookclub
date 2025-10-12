import React, { useState, useEffect } from 'react';
import { auth, onAuthStateChanged, getRedirectResult } from './firebase';
import Dashboard from './Dashboard';
import Login from './Login';
import { CircularProgress, Box } from '@mui/material';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User is signed in.
        }
      } catch (error) {
        console.error("Authentication error:", error);
      }
    };

    handleRedirect();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return user ? <Dashboard user={user} /> : <Login />;
}

export default App;
