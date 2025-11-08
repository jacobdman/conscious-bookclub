import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getClubGoalsReport } from 'services/clubs/goalsReport.service';
import HabitConsistencyLeaderboard from 'components/HabitConsistencyLeaderboard';
import HabitStreaksLeaderboard from 'components/HabitStreaksLeaderboard';
import WeeklyCompletionTrendByMember from './WeeklyCompletionTrendByMember';
import AverageCompletionByType from './AverageCompletionByType';
import ParticipationHeatmap from './ParticipationHeatmap';
import TopPerformersByCategory from './TopPerformersByCategory';
import ClubGoalTypeDistribution from './ClubGoalTypeDistribution';

const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  const start = startDate.toLocaleDateString();
  const end = endDate.toLocaleDateString();
  return `${start} - ${end}`;
};

const getDateRangeForPeriod = (period) => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'currentMonth': {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'currentQuarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'currentYear': {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
      break;
    }
    case 'custom':
    default:
      return null; // Custom will use existing startDate/endDate state
  }

  return { startDate, endDate };
};

const ClubGoalsReport = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [reportData, setReportData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [weeklyTrendData, setWeeklyTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [weeklyTrendLoading, setWeeklyTrendLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const weeklyTrendRef = React.useRef(null);
  
  // Date range state - default to current quarter
  const [dateRangePeriod, setDateRangePeriod] = useState('currentQuarter');
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), quarter * 3, 1);
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3);
    const lastDay = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    lastDay.setHours(23, 59, 59, 999);
    return lastDay;
  });

  // Update dates when period changes
  useEffect(() => {
    if (dateRangePeriod !== 'custom') {
      const range = getDateRangeForPeriod(dateRangePeriod);
      if (range) {
        setStartDate(range.startDate);
        setEndDate(range.endDate);
      }
    }
  }, [dateRangePeriod]);

  // Fetch competitive goals data (always loaded)
  useEffect(() => {
    const fetchReport = async () => {
      if (!user || !currentClub) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getClubGoalsReport(
          currentClub.id,
          user.uid,
          startDate,
          endDate,
          false // Don't include expensive analytics
        );
        setReportData(data);
      } catch (err) {
        setError('Failed to load goals report');
        console.error('Error fetching goals report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user, currentClub, startDate, endDate]);

  // Reset analytics and weekly trend data when date range changes
  useEffect(() => {
    setAnalyticsData(null);
    setWeeklyTrendData(null);
  }, [startDate, endDate]);

  // Lazy load weekly trend when section comes into view
  useEffect(() => {
    const currentRef = weeklyTrendRef.current;
    if (!currentRef || weeklyTrendData || !user || !currentClub) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !weeklyTrendData && !weeklyTrendLoading) {
          const fetchWeeklyTrend = async () => {
            try {
              setWeeklyTrendLoading(true);
              const data = await getClubGoalsReport(
                currentClub.id,
                user.uid,
                startDate,
                endDate,
                false, // Don't include analytics
                true // Include weekly trend
              );
              setWeeklyTrendData(data.weeklyTrendByMember);
            } catch (err) {
              console.error('Error fetching weekly trend:', err);
            } finally {
              setWeeklyTrendLoading(false);
            }
          };
          fetchWeeklyTrend();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(currentRef);

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [weeklyTrendData, weeklyTrendLoading, user, currentClub, startDate, endDate]);

  // Fetch analytics data only when analytics tab is active
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user || !currentClub || activeTab !== 1 || analyticsData) return;

      try {
        setAnalyticsLoading(true);
        const data = await getClubGoalsReport(
          currentClub.id,
          user.uid,
          startDate,
          endDate,
          true // Include expensive analytics
        );
        setAnalyticsData(data);
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, [user, currentClub, startDate, endDate, activeTab, analyticsData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!reportData) {
    return (
      <Box p={3}>
        <Typography variant="body2" color="text.secondary">
          No report data available
        </Typography>
      </Box>
    );
  }

  const {
    leaderboard,
    streakLeaderboard,
    topPerformers,
  } = reportData || {};

  // Use lazy-loaded weekly trend if available, otherwise use from reportData
  const weeklyTrendByMember = weeklyTrendData || reportData?.weeklyTrendByMember;

  const analytics = activeTab === 1 ? (analyticsData || reportData) : null;
  const {
    averageCompletionByType,
    participationHeatmap,
    clubGoalTypeDistribution,
  } = analytics || {};

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 2 }}>
        {/* Date Range Selector */}
        <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Date Range</InputLabel>
            <Select
              value={dateRangePeriod}
              label="Date Range"
              onChange={(e) => setDateRangePeriod(e.target.value)}
            >
              <MenuItem value="currentMonth">Current Month</MenuItem>
              <MenuItem value="currentQuarter">Current Quarter</MenuItem>
              <MenuItem value="currentYear">Current Year</MenuItem>
              <MenuItem value="custom">Custom</MenuItem>
            </Select>
          </FormControl>
          
          {dateRangePeriod === 'custom' && (
            <>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                  },
                }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                slotProps={{
                  textField: {
                    size: 'small',
                  },
                }}
              />
            </>
          )}
          
          <Typography variant="body2" color="text.secondary">
            {formatDateRange(startDate, endDate)}
          </Typography>
        </Box>

        {/* Section 1: Leaderboard Section - At the very top */}
        <Box sx={{ mb: 5 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Habit Consistency Leaderboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Average habit completion rate ({formatDateRange(startDate, endDate)})
          </Typography>
          <HabitConsistencyLeaderboard leaderboard={leaderboard} />
        </Box>

        {/* Tabs for Competitive Goals and Analytics */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontSize: '1rem',
                fontWeight: 500,
                minHeight: 48,
              },
            }}
          >
            <Tab label="Competitive Goals" />
            <Tab label="Insights & Analytics" />
          </Tabs>
        </Box>

        {/* Tab Panel: Competitive Goals */}
        {activeTab === 0 && (
          <Box>
            {/* Habit Streaks Leaderboard */}
            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Habit Streaks Leaderboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Longest active streaks ({formatDateRange(startDate, endDate)})
              </Typography>
              <HabitStreaksLeaderboard leaderboard={streakLeaderboard} />
            </Box>

            {/* Top Performers by Category */}
            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Top Performers by Category
              </Typography>
              <TopPerformersByCategory topPerformers={topPerformers} />
            </Box>

            {/* Weekly Completion Trend by Member */}
            <Box sx={{ mb: 4 }} ref={weeklyTrendRef}>
              <Card 
                elevation={2}
                sx={{ 
                  width: '100%',
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                    Weekly Completion Trend by Member
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Consistency over time per member - see who is consistently achieving their goals
                  </Typography>
                  {weeklyTrendLoading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : (
                    <WeeklyCompletionTrendByMember weeklyTrendByMember={weeklyTrendByMember} />
                  )}
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}

        {/* Tab Panel: Insights & Analytics */}
        {activeTab === 1 && (
          <Box>
            {analyticsLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Average Completion by Goal Type */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', flexGrow: 1 }}>
                    <Card 
                      elevation={2}
                      sx={{ 
                        height: '100%', 
                        width: '100%',
                        borderRadius: 2,
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                          Average Completion by Goal Type
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Compare how the club performs on different goal types
                        </Typography>
                        <AverageCompletionByType averageCompletionByType={averageCompletionByType} />
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* Club Goal Type Distribution */}
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', flexGrow: 1 }}>
                    <Card 
                      elevation={2}
                      sx={{ 
                        height: '100%', 
                        width: '100%',
                        borderRadius: 2,
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                          Club Goal Type Distribution
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Overview of active goals by type across the club
                        </Typography>
                        <ClubGoalTypeDistribution clubGoalTypeDistribution={clubGoalTypeDistribution} />
                      </CardContent>
                    </Card>
                  </Grid>

                </Grid>

                {/* Participation Heatmap */}
                <Box sx={{ mb: 4 }}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      width: '100%',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                        Participation Heatmap
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Weekly engagement density across the club per user
                      </Typography>
                      <ParticipationHeatmap participationHeatmap={participationHeatmap} />
                    </CardContent>
                  </Card>
                </Box>
              </>
            )}
          </Box>
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default ClubGoalsReport;

