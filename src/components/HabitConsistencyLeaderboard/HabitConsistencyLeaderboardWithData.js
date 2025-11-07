import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getClubGoalsReport } from 'services/clubs/goalsReport.service';
import HabitConsistencyLeaderboard from './HabitConsistencyLeaderboard';

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = startDate.toLocaleDateString();
  const end = endDate.toLocaleDateString();
  return `${start} - ${end}`;
};

const HabitConsistencyLeaderboardWithData = ({ 
  title = "Habit Consistency Leaderboard",
  showSubtitle = true,
  dateRangePeriod = 'currentMonth',
  startDate: propStartDate,
  endDate: propEndDate,
}) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Date range state - default to current quarter
  const [startDate, setStartDate] = useState(() => {
    if (propStartDate) return propStartDate;
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3, 1);
  });
  const [endDate, setEndDate] = useState(() => {
    if (propEndDate) return propEndDate;
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const lastDay = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  });

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user || !currentClub) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getClubGoalsReport(
          currentClub.id,
          user.uid,
          startDate,
          endDate
        );
        setLeaderboard(data.leaderboard || []);
      } catch (err) {
        setError('Failed to load leaderboard');
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [user, currentClub, startDate, endDate]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={2}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return null; // Fail silently for dashboard
  }

  return (
    <Box>
      {title && (
        <Typography variant="h5" gutterBottom>
          {title}
        </Typography>
      )}
      {showSubtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.65rem' }}>
            Average habit completion rate ({formatDateRange(startDate, endDate)})
        </Typography>
      )}
      <HabitConsistencyLeaderboard leaderboard={leaderboard} />
    </Box>
  );
};

export default HabitConsistencyLeaderboardWithData;

