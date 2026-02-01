import React, { useState, useEffect } from 'react';
import {
  Alert,
  Button,
  Grid,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import SetupLayout from 'components/SetupLayout';
import useClubContext from 'contexts/Club';
import { useAuth } from 'AuthContext';
import { joinClubByInviteCode } from 'services/clubs/clubs.service';
import { useNavigate, useSearchParams } from 'react-router-dom';

const NoClub = () => {
  const { user } = useAuth();
  const { refreshClubs, setCurrentClub } = useClubContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Get invite code from URL params
  useEffect(() => {
    const codeFromUrl = searchParams.get('inviteCode');
    if (codeFromUrl) {
      setInviteCode(codeFromUrl);
    }
  }, [searchParams]);

  const handleJoinClub = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    if (!user) {
      setError('You must be logged in to join a club');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await joinClubByInviteCode(inviteCode.trim().toUpperCase(), user.uid);
      
      // Refresh clubs to get the updated list
      await refreshClubs();
      
      // Set the newly joined club as the current club
      if (result && result.clubId) {
        await setCurrentClub(result.clubId);
      }
      
      // Navigate to dashboard
      navigate('/');
    } catch (err) {
      // Handle specific error messages
      if (err.message) {
        if (err.message.includes('already a member')) {
          setError('You are already a member of this club.');
        } else if (err.message.includes('not found')) {
          setError('Invalid invite code. Please check the code and try again.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to join club. Please check your invite code and try again.');
      }
      console.error('Error joining club:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = () => {
    navigate('/setup/create-club');
  };

  return (
    <SetupLayout>
      <Grid
        container
        spacing={3}
        justifyContent="center"
        alignItems="stretch"
        sx={{ minHeight: '60vh', p: 3 }}
      >
        <Grid item xs={12} md={6} lg={5}>
          <Paper sx={{ p: 4, width: '100%' }}>
            <Typography variant="h4" gutterBottom align="center">
              Join a Club
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }} align="center">
              You need to be a member of a club to access the app. Enter an invite code below to join a club.
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <TextField
              label="Invite Code"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              placeholder="Enter club invite code"
              disabled={loading}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleJoinClub();
                }
              }}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleJoinClub}
              disabled={loading || !inviteCode.trim()}
              sx={{ mb: 2 }}
            >
              {loading ? 'Joining...' : 'Join Club'}
            </Button>
            <Typography variant="body2" color="text.secondary" align="center">
              Don't have an invite code? Contact a club owner to get one.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6} lg={5}>
          <Paper sx={{ p: 4, width: '100%' }}>
            <Typography variant="h4" gutterBottom align="center">
              Create a Club
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }} align="center">
              You can create your own club to invite your friends to.
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleCreateClub}
              disabled={loading}
            >
              Create a Club
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </SetupLayout>
  );
};

export default NoClub;

