import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  ThemeProvider,
  createTheme,
  CssBaseline,
  TextField,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import AppleIcon from '@mui/icons-material/Apple';
import { useAuth } from './AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';

const theme = createTheme({
  palette: {
    primary: {
      main: '#5D473A',
    },
    secondary: {
      main: '#BFA480',
    },
    background: {
      default: '#F5F1EA',
    },
  },
  typography: {
    fontFamily: 'Georgia, serif',
  },
});

const Login = () => {
  const { signInWithGoogle, signInWithApple, signInWithEmail, signUpWithEmail, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [useEmailAuth, setUseEmailAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const isAppleEnabled = false;

  // Get invite code from URL params
  useEffect(() => {
    const codeFromUrl = searchParams.get('inviteCode');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (inviteCode) {
        navigate(`/join-club?inviteCode=${encodeURIComponent(inviteCode)}`);
      } else {
        navigate('/');
      }
    }
  }, [user, inviteCode, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
      // Navigation will happen via useEffect when user state updates
    } catch (error) {
      setError('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!isAppleEnabled) {
      setError('Apple sign-in is not yet enabled.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signInWithApple();
    } catch (error) {
      setError('Failed to sign in with Apple. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }

    if (isSignUp && !displayName.trim()) {
      setError('Please enter your name.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (isSignUp) {
        await signUpWithEmail(email.trim(), password, displayName.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
    } catch (error) {
      setError('Failed to sign in. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F5F1EA 0%, #BFA480 100%)',
          p: 2,
        }}
      >
        <Card sx={{ maxWidth: 400, width: '100%' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              Conscious Book Club
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              Sign in to access your reading goals and connect with fellow book lovers.
              New users can create an account in seconds.
            </Typography>
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {inviteCode && (
              <Alert severity="info" sx={{ mb: 2 }}>
                You'll join the club with invite code: <strong>{inviteCode}</strong>
              </Alert>
            )}
            
            <Stack spacing={2}>
              <Button
                variant="outlined"
                onClick={() => setUseEmailAuth((prev) => !prev)}
                disabled={loading}
                sx={{ textTransform: 'none' }}
              >
                {useEmailAuth ? 'Use social sign-in instead' : 'Use email and password'}
              </Button>

              {useEmailAuth ? (
                <Box component="form" onSubmit={handleEmailSubmit}>
                  <Stack spacing={2}>
                    {isSignUp && (
                      <TextField
                        label="Name"
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        fullWidth
                      />
                    )}
                    <TextField
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      fullWidth
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      fullWidth
                      disabled={loading}
                      startIcon={loading ? <CircularProgress size={20} /> : null}
                      sx={{
                        py: 1.5,
                        fontSize: '1.05rem',
                        textTransform: 'none',
                        borderRadius: 2,
                      }}
                    >
                      {loading
                        ? 'Signing in...'
                        : isSignUp
                          ? 'Create account'
                          : 'Sign in with email'}
                    </Button>
                    <Button
                      variant="text"
                      onClick={() => setIsSignUp((prev) => !prev)}
                      disabled={loading}
                      sx={{ textTransform: 'none' }}
                    >
                      {isSignUp
                        ? 'Already have an account? Sign in'
                        : 'Need an account? Sign up'}
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <GoogleIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: '1.1rem',
                      textTransform: 'none',
                      borderRadius: 2,
                    }}
                  >
                    {loading ? 'Signing in...' : 'Continue with Google'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    fullWidth
                    onClick={handleAppleSignIn}
                    disabled={loading || !isAppleEnabled}
                    startIcon={loading ? <CircularProgress size={20} /> : <AppleIcon />}
                    sx={{
                      py: 1.5,
                      fontSize: '0.9rem',
                      textTransform: 'none',
                      borderRadius: 2,
                    }}
                  >
                    Continue with Apple (coming soon)
                  </Button>
                </Stack>
              )}

              {inviteCode && (
                <Typography variant="body2" color="text.secondary" align="center">
                  After signing in, you'll be redirected to join the club.
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default Login;
