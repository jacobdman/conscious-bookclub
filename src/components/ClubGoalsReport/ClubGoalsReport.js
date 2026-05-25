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
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  List,
  ListItemButton,
  ListItemText,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getClubGoalsAnalyticsOnly } from 'services/clubs/goalsReport.service';
import { getLeaderboardReport, getWeeklyTrendByMemberReport } from 'services/reports/reports.service';
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
      return null;
  }

  return { startDate, endDate };
};

const ClubGoalsReport = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [reportData, setReportData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [weeklyTrendData, setWeeklyTrendData] = useState(null);
  const [weeklyTrendLoading, setWeeklyTrendLoading] = useState(false);
  const [weeklyTrendError, setWeeklyTrendError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

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

  useEffect(() => {
    if (dateRangePeriod !== 'custom') {
      const range = getDateRangeForPeriod(dateRangePeriod);
      if (range) {
        setStartDate(range.startDate);
        setEndDate(range.endDate);
      }
    }
  }, [dateRangePeriod]);

  useEffect(() => {
    setAnalyticsData(null);
    setWeeklyTrendData(null);
    setReportData(null);
  }, [startDate, endDate]);

  // Parallel: leaderboard bundle + weekly trend (independent completion times)
  useEffect(() => {
    if (!user || !currentClub) return;

    let cancelled = false;

    const runLeaderboard = async () => {
      setLeaderboardLoading(true);
      setLeaderboardError(null);
      try {
        const data = await getLeaderboardReport(
          currentClub.id,
          user.uid,
          startDate,
          endDate,
        );
        if (!cancelled) {
          setReportData(data);
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        if (!cancelled) {
          setLeaderboardError('Failed to load leaderboard data');
          setReportData(null);
        }
      } finally {
        if (!cancelled) {
          setLeaderboardLoading(false);
        }
      }
    };

    const runWeeklyTrend = async () => {
      setWeeklyTrendLoading(true);
      setWeeklyTrendError(null);
      try {
        const data = await getWeeklyTrendByMemberReport(
          currentClub.id,
          user.uid,
          startDate,
          endDate,
        );
        if (!cancelled) {
          setWeeklyTrendData(data?.weeklyTrendByMember ?? null);
        }
      } catch (err) {
        console.error('Error fetching weekly trend:', err);
        if (!cancelled) {
          setWeeklyTrendError('Failed to load weekly trend');
          setWeeklyTrendData(null);
        }
      } finally {
        if (!cancelled) {
          setWeeklyTrendLoading(false);
        }
      }
    };

    runLeaderboard();
    runWeeklyTrend();

    return () => {
      cancelled = true;
    };
  }, [user, currentClub, startDate, endDate]);

  useEffect(() => {
    if (!user || !currentClub || activeTab !== 1 || analyticsData) return;

    let cancelled = false;

    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const data = await getClubGoalsAnalyticsOnly(
          currentClub.id,
          user.uid,
          startDate,
          endDate,
        );
        if (!cancelled) {
          setAnalyticsData(data);
        }
      } catch (err) {
        console.error('Error fetching analytics:', err);
        if (!cancelled) {
          setAnalyticsData(null);
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [user, currentClub, startDate, endDate, activeTab, analyticsData]);

  if (!user || !currentClub) {
    return (
      <Box p={3}>
        <Typography variant="body2" color="text.secondary">
          Select a club to view the goals report.
        </Typography>
      </Box>
    );
  }

  const {
    leaderboard,
    streakLeaderboard,
    topPerformers,
  } = reportData || {};

  const weeklyTrendByMember = weeklyTrendData;

  const analytics = activeTab === 1 ? analyticsData : null;
  const {
    averageCompletionByType,
    participationHeatmap,
    clubGoalTypeDistribution,
  } = analytics || {};

  const leaderboardBusy = leaderboardLoading;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 2 }}>
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

        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            mb: 2,
          }}
        >
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={activeTab}
            onChange={(e, v) => v !== null && setActiveTab(v)}
            aria-label="Club report section"
            size="small"
            color="primary"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                flex: 1,
              },
            }}
          >
            <ToggleButton value={0}>Competitive</ToggleButton>
            <ToggleButton value={1}>Insights</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 0, md: 3 },
            alignItems: 'flex-start',
          }}
        >
          <Paper
            elevation={0}
            variant="outlined"
            sx={{
              display: { xs: 'none', md: 'block' },
              minWidth: 240,
              maxWidth: 280,
              borderRadius: 2,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <List component="nav" dense disablePadding aria-label="Club report sections">
              <ListItemButton selected={activeTab === 0} onClick={() => setActiveTab(0)}>
                <ListItemText
                  primary="Competitive goals"
                  secondary="Leaderboards & trends"
                  primaryTypographyProps={{
                    fontWeight: activeTab === 0 ? 700 : 500,
                  }}
                />
              </ListItemButton>
              <ListItemButton selected={activeTab === 1} onClick={() => setActiveTab(1)}>
                <ListItemText
                  primary="Insights & analytics"
                  secondary="Charts & participation"
                  primaryTypographyProps={{
                    fontWeight: activeTab === 1 ? 700 : 500,
                  }}
                />
              </ListItemButton>
            </List>
          </Paper>

          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
        {activeTab === 0 && (
          <Box>
            <Box sx={{ mb: 5 }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
                Habit Consistency Leaderboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Average habit completion rate ({formatDateRange(startDate, endDate)})
              </Typography>
              {leaderboardBusy ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress />
                </Box>
              ) : leaderboardError ? (
                <Alert severity="error">{leaderboardError}</Alert>
              ) : (
                <HabitConsistencyLeaderboard leaderboard={leaderboard} />
              )}
            </Box>

            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                Daily Habit Streaks Leaderboard
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {`Longest active streaks on daily habits—consecutive days meeting targets (${formatDateRange(startDate, endDate)})`}
              </Typography>
              {leaderboardBusy ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress />
                </Box>
              ) : leaderboardError ? (
                <Alert severity="error">{leaderboardError}</Alert>
              ) : (
                <HabitStreaksLeaderboard leaderboard={streakLeaderboard} />
              )}
            </Box>

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
                    Weekly Completion Trend by Member
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Consistency over time per member - see who is consistently achieving their goals
                  </Typography>
                  {weeklyTrendLoading ? (
                    <Box display="flex" justifyContent="center" p={3}>
                      <CircularProgress />
                    </Box>
                  ) : weeklyTrendError ? (
                    <Alert severity="error">{weeklyTrendError}</Alert>
                  ) : (
                    <WeeklyCompletionTrendByMember weeklyTrendByMember={weeklyTrendByMember} />
                  )}
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ mb: 5 }}>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 2 }}>
                Top Performers by Category
              </Typography>
              {leaderboardBusy ? (
                <Box display="flex" justifyContent="center" py={3}>
                  <CircularProgress />
                </Box>
              ) : leaderboardError ? (
                <Alert severity="error">{leaderboardError}</Alert>
              ) : (
                <TopPerformersByCategory topPerformers={topPerformers} />
              )}
            </Box>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {analyticsLoading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
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
        </Box>
      </Box>
    </LocalizationProvider>
  );
};

export default ClubGoalsReport;
