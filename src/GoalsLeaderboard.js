import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { getLeaderboard } from './firebase';

const GoalsLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        console.log('Fetching leaderboard...');
        const result = await getLeaderboard();
        console.log('Leaderboard result:', result);
        setLeaderboardData(result.data || []);
      } catch (err) {
        console.error('Leaderboard error:', err);
        setError('Failed to fetch leaderboard data.');
        // Set empty data as fallback
        setLeaderboardData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <CircularProgress />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Typography color="error">{error}</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Goals Leaderboard
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {leaderboardData.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No leaderboard data available yet. Start setting goals to see your progress!
            </Typography>
          ) : (
            leaderboardData
              .sort((a, b) => b.progress - a.progress)
              .map((user) => (
                <Box key={user.name}>
                  <Typography variant="body2">{user.name}</Typography>
                  <LinearProgress
                    variant="determinate"
                    value={user.progress}
                    sx={{ height: 10, borderRadius: 5 }}
                  />
                </Box>
              ))
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default GoalsLeaderboard;