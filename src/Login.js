import React from 'react';
import { signInWithGoogle } from './firebase';
import { Button, Box, Typography, Paper } from '@mui/material';

const Login = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#F5F1EA',
      }}
    >
      <Paper elevation={3} sx={{ padding: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Welcome to the Conscious Book Club
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Please sign in to continue
        </Typography>
        <Button variant="contained" onClick={signInWithGoogle}>
          Sign in with Google
        </Button>
      </Paper>
    </Box>
  );
};

export default Login;
