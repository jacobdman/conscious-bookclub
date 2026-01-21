import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getLeaderboardReport } from 'services/reports/reports.service';
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

  // Date range state - default to current quarter (local time)
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const defaultStart = new Date(now.getFullYear(), quarter * 3, 1, 0, 0, 0, 0);
    const defaultEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 0, 23, 59, 59, 999);

    return {
      startDate: propStartDate || defaultStart,
      endDate: propEndDate || defaultEnd,
    };
  }, [propStartDate, propEndDate]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user || !currentClub) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await getLeaderboardReport(
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

