import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import { getTopFinishedBooksUsers, getUserStats } from '../services/firestoreService';
import { useAuth } from '../AuthContext';

const FinishedBooksLeaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserStats, setCurrentUserStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        
        // Get top 10 users
        const topUsers = await getTopFinishedBooksUsers(10);
        console.log('Top users from leaderboard:', topUsers);
        setLeaderboard(topUsers);
        
        // Get current user's stats if they're not in top 10
        if (user) {
          console.log('Current user ID:', user.uid);
          const currentUserInTop = topUsers.find(u => u.userId === user.uid);
          console.log('Current user in top:', currentUserInTop);
          if (!currentUserInTop) {
            const userStats = await getUserStats(user.uid);
            console.log('Current user stats:', userStats);
            setCurrentUserStats(userStats);
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user]);

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
    }
  };

  const getRankColor = (index) => {
    switch (index) {
      case 0: return 'warning';
      case 1: return 'default';
      case 2: return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Finished Books Leaderboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Top readers by completed books
        </Typography>
        
        {leaderboard.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            No data available yet
          </Typography>
        ) : (
          <List>
            {leaderboard.slice(0, 3).map((userStats, index) => (
              <React.Fragment key={userStats.userId}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar
                      src={userStats.photoURL}
                      sx={{ 
                        width: 40, 
                        height: 40,
                        bgcolor: index === 0 ? 'warning.main' : 
                                index === 1 ? 'grey.400' : 
                                index === 2 ? 'secondary.main' : 'primary.main'
                      }}
                    >
                      {userStats.displayName?.charAt(0) || '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6">
                          {getRankIcon(index)}
                        </Typography>
                        <Typography variant="subtitle1">
                          {userStats.displayName || 'Unknown User'}
                        </Typography>
                        {userStats.userId === user?.uid && (
                          <Chip label="You" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {userStats.finishedCount} {userStats.finishedCount === 1 ? 'book' : 'books'} finished
                        {userStats.lastFinishedAt && (
                          <span> • Last: {new Date(userStats.lastFinishedAt.seconds * 1000).toLocaleDateString()}</span>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < 2 && <Divider />}
              </React.Fragment>
            ))}
            
            {/* Show current user if not in top 3 */}
            {currentUserStats && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <Avatar
                      src={currentUserStats.photoURL}
                      sx={{ width: 40, height: 40 }}
                    >
                      {currentUserStats.displayName?.charAt(0) || '?'}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6">
                          #{leaderboard.findIndex(u => u.finishedCount > currentUserStats.finishedCount) + 1}
                        </Typography>
                        <Typography variant="subtitle1">
                          {currentUserStats.displayName || 'Unknown User'}
                        </Typography>
                        <Chip label="You" size="small" color="primary" />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {currentUserStats.finishedCount} {currentUserStats.finishedCount === 1 ? 'book' : 'books'} finished
                        {currentUserStats.lastFinishedAt && (
                          <span> • Last: {new Date(currentUserStats.lastFinishedAt.seconds * 1000).toLocaleDateString()}</span>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
              </>
            )}
          </List>
        )}
        
        {leaderboard.length > 3 && !currentUserStats && (
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              ... and {leaderboard.length - 3} more readers
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FinishedBooksLeaderboard;
