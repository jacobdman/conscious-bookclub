import React, { useEffect, useState } from 'react';
// UI
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Components
import ProfileAvatar from 'components/ProfileAvatar';
// Services
import { getTopReaders } from 'services/books/books.service';

const FinishedBooksLeaderboard = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUserStats, setCurrentUserStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAll, setLoadingAll] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!currentClub) {
        setLoading(false);
        setLeaderboard([]);
        return;
      }

      try {
        setLoading(true);

        // Get top 10 users
        const topUsers = await getTopReaders(currentClub.id, 10);
        setLeaderboard(topUsers);
        setShowAll(false);

        // Only show current user separately if they're NOT in the top 3
        if (user) {
          const top3 = topUsers.slice(0, 3);
          const currentUserInTop3 = top3.find(u => u.id === user.uid);
          const currentUserInTop10 = topUsers.find(u => u.id === user.uid);

          // Only set currentUserStats if they're in top 10 but NOT in top 3
          if (currentUserInTop10 && !currentUserInTop3) {
            setCurrentUserStats(currentUserInTop10);
          } else {
            setCurrentUserStats(null);
          }
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, currentClub]);

  const handleShowAll = async () => {
    if (!currentClub || loadingAll) return;

    try {
      setLoadingAll(true);
      const allUsers = await getTopReaders(currentClub.id, 1000);
      setLeaderboard(allUsers);
      setShowAll(true);

      if (user) {
        const top3 = allUsers.slice(0, 3);
        const currentUserInTop3 = top3.find(u => u.id === user.uid);
        if (currentUserInTop3) {
          setCurrentUserStats(null);
        } else {
          const currentUser = allUsers.find(u => u.id === user.uid);
          setCurrentUserStats(currentUser || null);
        }
      }
    } catch (error) {
      console.error('Error fetching full leaderboard:', error);
    } finally {
      setLoadingAll(false);
    }
  };

  const getRankIcon = (index) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `#${index + 1}`;
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
            {(showAll ? leaderboard : leaderboard.slice(0, 3)).map((userStats, index) => (
              <React.Fragment key={userStats.id}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <ProfileAvatar
                      user={userStats}
                      size={40}
                      rank={index + 1}
                      showEntryRing
                      sx={{
                        bgcolor: index === 0 ? 'warning.main' :
                          index === 1 ? 'grey.400' :
                          index === 2 ? 'secondary.main' : 'primary.main'
                      }}
                    />
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
                        {userStats.id === user?.uid && (
                          <Chip label="You" size="small" color="primary" />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {userStats.finishedCount} {userStats.finishedCount === 1 ? 'book' : 'books'} finished
                        {userStats.lastFinishedAt && (
                          <span> • Last: {new Date(userStats.lastFinishedAt).toLocaleDateString()}</span>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < (showAll ? leaderboard.length - 1 : 2) && <Divider />}
              </React.Fragment>
            ))}
            
            {/* Show current user if not in top 3 */}
            {!showAll && currentUserStats && (
              <>
                <Divider sx={{ my: 1 }} />
                <ListItem sx={{ px: 0 }}>
                  <ListItemAvatar>
                    <ProfileAvatar
                      user={currentUserStats}
                      size={40}
                      showEntryRing
                    />
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
                          <span> • Last: {new Date(currentUserStats.lastFinishedAt).toLocaleDateString()}</span>
                        )}
                      </Typography>
                    }
                  />
                </ListItem>
              </>
            )}
          </List>
        )}
        
        {leaderboard.length > 3 && !currentUserStats && !showAll && (
          <Box mt={2}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              ... and {leaderboard.length - 3} more readers
            </Typography>
            <Box mt={1} display="flex" justifyContent="center">
              <Button
                size="small"
                variant="text"
                onClick={handleShowAll}
                disabled={loadingAll}
              >
                {loadingAll ? 'Loading...' : 'Show all'}
              </Button>
            </Box>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default FinishedBooksLeaderboard;
