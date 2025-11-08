import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  ThemeProvider,
  createTheme,
  CssBaseline,
  TextField,
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
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
  const { signInWithGoogle, user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inviteCode, setInviteCode] = useState('');

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
              Sign in with Google to access your reading goals and connect with fellow book lovers. 
              New users will be automatically registered.
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
                mb: 2,
              }}
            >
              {loading ? 'Signing in...' : 'Continue with Google'}
            </Button>

            {inviteCode && (
              <Typography variant="body2" color="text.secondary" align="center">
                After signing in, you'll be redirected to join the club.
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default Login;
