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
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getPersonalGoalsReport } from 'services/goals/personalGoalsReport.service';
import { getWeeklyGoalsBreakdownReport } from 'services/reports/reports.service';
import { WeeklyCompletionTrend, GoalTypeDistribution } from 'components/GoalsReport';
import WeeklyGoalsBreakdownChart from 'components/GoalsReport/WeeklyGoalsBreakdownChart';

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

const PersonalGoalsReport = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [reportData, setReportData] = useState(null);
  const [weeklyBreakdown, setWeeklyBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [error, setError] = useState(null);
  const [habitDetailsExpanded, setHabitDetailsExpanded] = useState(false);
  
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

  useEffect(() => {
    const fetchReport = async () => {
      if (!user || !currentClub) return;

      try {
        setLoading(true);
        setError(null);
        const data = await getPersonalGoalsReport(
          user.uid,
          currentClub.id,
          startDate,
          endDate
        );
        setReportData(data);
      } catch (err) {
        setError('Failed to load goals report');
        console.error('Error fetching personal goals report:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [user, currentClub, startDate, endDate]);

  // Fetch weekly breakdown separately
  useEffect(() => {
    const fetchBreakdown = async () => {
      if (!user || !currentClub) return;

      try {
        setBreakdownLoading(true);
        const data = await getWeeklyGoalsBreakdownReport(
          user.uid,
          currentClub.id,
          startDate,
          endDate
        );
        setWeeklyBreakdown(data.weeklyBreakdown || []);
      } catch (err) {
        console.error('Error fetching weekly goals breakdown:', err);
        setWeeklyBreakdown([]);
      } finally {
        setBreakdownLoading(false);
      }
    };

    fetchBreakdown();
  }, [user, currentClub, startDate, endDate]);

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

  const { habitConsistency, weeklyTrend, goalTypeDistribution } = reportData;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ p: 0 }}>
        <Typography variant="h4" gutterBottom>
          Personal Goals Report
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Track your personal progress and consistency!
        </Typography>

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

        <Grid container spacing={3}>
          {/* Section 1.1: Habit Consistency (Quarterly Average) */}
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ height: '100%', width: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Habit Consistency (Quarterly Average)
                </Typography>
                
                {/* Prominent Score Display */}
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 2,
                  }}
                >
                  <Typography 
                    variant="h1" 
                    sx={{ 
                      fontSize: { xs: '4rem', sm: '5rem', md: '6rem' },
                      fontWeight: 700,
                      color: 'primary.main',
                      lineHeight: 1,
                      mb: 0,
                    }}
                  >
                    {habitConsistency.weightedAverage.toFixed(1)}%
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ textAlign: 'center' }}
                  >
                    Weighted Average
                  </Typography>
                </Box>

                {/* Expandable Details Section */}
                <Box>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      py: 0,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        borderRadius: 1,
                      },
                    }}
                    onClick={() => setHabitDetailsExpanded(!habitDetailsExpanded)}
                  >
                    <Typography variant="body2" color="text.secondary">
                      How is this calculated?
                    </Typography>
                    <IconButton size="small">
                      {habitDetailsExpanded ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Box>
                  
                  <Collapse in={habitDetailsExpanded}>
                    <Box>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        This score is a weighted average of all habit goals for the current quarter. 
                        Habits are weighted by their position in your list, with higher positions 
                        (more important habits) receiving higher weights. The formula uses: 
                        <Box component="span" sx={{ fontFamily: 'monospace', ml: 0.5 }}>
                          weight = 1 / log₂(position + 1)
                        </Box>
                      </Typography>
                      
                      {habitConsistency.habitDetails && habitConsistency.habitDetails.length > 0 && (
                        <>
                          <Divider sx={{ my: 2 }} />
                          <Typography variant="subtitle2" gutterBottom>
                            Habit Breakdown:
                          </Typography>
                          {habitConsistency.habitDetails.map((habit, index) => (
                            <Box 
                              key={habit.goalId} 
                              sx={{ 
                                mb: 1.5,
                                p: 1.5,
                                backgroundColor: 'background.default',
                                borderRadius: 1,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {habit.title}
                                </Typography>
                                <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
                                  {habit.consistencyRate.toFixed(1)}%
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Position: {habit.habitPosition}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Weight: {habit.weight.toFixed(2)}
                                </Typography>
                              </Box>
                            </Box>
                          ))}
                        </>
                      )}
                    </Box>
                  </Collapse>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Section 1.2: Weekly Goals Breakdown */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Goals Breakdown
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  See which specific goals you completed or missed each week
                </Typography>
                <WeeklyGoalsBreakdownChart weeklyBreakdown={weeklyBreakdown} loading={breakdownLoading} />
              </CardContent>
            </Card>
          </Grid>

          {/* Section 1.3: Weekly Completion Trend */}
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ height: '100%', width: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Weekly Completion Trend
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  % of weekly goals completed per week
                </Typography>
                <WeeklyCompletionTrend weeklyTrend={weeklyTrend} />
              </CardContent>
            </Card>
          </Grid>

          {/* Section 1.4: Goal Type Distribution */}
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexGrow: 1 }}>
            <Card sx={{ height: '100%', width: '100%' }}>
              <CardContent sx={{ p: { xs: 1.5, sm: 2 }, '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
                <Typography variant="h6" gutterBottom sx={{ mb: { xs: 1, sm: 1.5 } }}>
                  Goal Type Distribution
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 1, sm: 2 } }}>
                  Overview of active goals by type
                </Typography>
                <GoalTypeDistribution goalTypeDistribution={goalTypeDistribution} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default PersonalGoalsReport;

