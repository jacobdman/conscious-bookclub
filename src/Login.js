import React, { useState } from 'react';
import { signInWithGoogle, signUpWithEmail, signInWithEmail } from './firebase';
import { Button, Box, Typography, Paper, TextField, Link } from '@mui/material';

const Login = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState(null);

  const handleAuthAction = async () => {
    setError(null);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err) {
      setError(err.message);
    }
  };

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
      <Paper elevation={3} sx={{ padding: 4, textAlign: 'center', width: '100%', maxWidth: 400 }}>
        <Typography variant="h4" gutterBottom>
          {isSignUp ? 'Create an Account' : 'Welcome Back'}
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 3 }}>
          Please {isSignUp ? 'sign up' : 'sign in'} to continue
        </Typography>

        <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {isSignUp && (
            <TextField
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              variant="outlined"
            />
          )}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant="outlined"
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            variant="outlined"
          />

          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <Button variant="contained" onClick={handleAuthAction}>
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>
        </Box>

        <Typography variant="body2" sx={{ mt: 2 }}>
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          <Link component="button" variant="body2" onClick={() => { setIsSignUp(!isSignUp); setError(null); }}>
            {isSignUp ? ' Sign In' : ' Sign Up'}
          </Link>
        </Typography>

        <Typography variant="body2" sx={{ my: 2 }}>
          OR
        </Typography>

        <Button variant="outlined" onClick={signInWithGoogle}>
          Sign in with Google
        </Button>
      </Paper>
    </Box>
  );
};

export default Login;
