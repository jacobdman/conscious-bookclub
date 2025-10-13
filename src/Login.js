import React, { useState } from 'react';
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
} from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from './AuthContext';

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
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (error) {
      console.error('Sign in error:', error);
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
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default Login;
