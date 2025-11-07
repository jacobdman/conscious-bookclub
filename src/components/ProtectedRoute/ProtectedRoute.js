import React from 'react';
import { Navigate } from 'react-router-dom';
import useClubContext from 'contexts/Club';
import { CircularProgress, Box } from '@mui/material';

const ProtectedRoute = ({ children }) => {
  const { currentClub, userClubs, loading } = useClubContext();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If user has no clubs or no current club selected, redirect to join-club screen
  if (!userClubs || userClubs.length === 0 || !currentClub) {
    return <Navigate to="/join-club" replace />;
  }

  return children;
};

export default ProtectedRoute;

