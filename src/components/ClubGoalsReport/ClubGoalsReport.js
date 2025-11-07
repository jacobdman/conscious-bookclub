import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { getClubGoalsReport } from 'services/clubs/goalsReport.service';
import HabitConsistencyLeaderboard from 'components/HabitConsistencyLeaderboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const HabitConsistencyLineChart = ({ timeSeries }) => {
  if (!timeSeries || timeSeries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No time series data available
      </Typography>
    );
  }

  const data = timeSeries.map((item, index) => ({
    period: `Period ${timeSeries.length - index}`,
    consistency: item.consistency.toFixed(1),
  }));

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="period" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="consistency"
            stroke="#0088FE"
            strokeWidth={2}
            name="Consistency %"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

const HabitConsistencyBarChart = ({ byMember }) => {
  if (!byMember || byMember.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No member data available
      </Typography>
    );
  }

  // Filter to only show members with consistency score > 0
  const data = byMember
    .filter((member) => member.consistencyScore > 0)
    .map((member) => ({
      name: member.user.displayName || 'Unknown',
      consistency: parseFloat(member.consistencyScore.toFixed(1)),
    }))
    .sort((a, b) => b.consistency - a.consistency);

  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No members with consistency scores above 0
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Bar dataKey="consistency" fill="#0088FE" name="Consistency %" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

const MetricProgressBarChart = ({ byMember }) => {
  if (!byMember || byMember.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No metric data available
      </Typography>
    );
  }

  // Filter out members with no progress and sort by progress descending
  // Create a new array to ensure proper sorting
  const filteredMembers = byMember.filter((member) => {
    const progress = parseFloat(member.progressPercentage || 0);
    return progress > 0;
  });
  
  // Sort by progress descending, then map to chart data format
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const progressA = parseFloat(a.progressPercentage || 0);
    const progressB = parseFloat(b.progressPercentage || 0);
    return progressB - progressA;
  });
  
  const data = sortedMembers.map((member) => ({
    name: member.user.displayName || 'Unknown',
    progress: parseFloat(member.progressPercentage || 0),
    userId: member.userId,
  }));

  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No members with metric progress above 0
      </Typography>
    );
  }

  // Custom tooltip to ensure correct data display
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: '4px',
            padding: '8px',
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            {data.name}
          </Typography>
          <Typography variant="body2" color="primary">
            Progress %: {data.progress.toFixed(1)}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={80}
            interval={0}
            tick={{ fontSize: 12 }}
          />
          <YAxis domain={[0, 'auto']} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar 
            dataKey="progress" 
            fill="#00C49F" 
            name="Progress %"
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

const MilestoneDonutChart = ({ clubWide }) => {
  if (!clubWide || clubWide.total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No milestone data available
      </Typography>
    );
  }

  const data = [
    { name: 'Completed', value: clubWide.completed },
    { name: 'Remaining', value: clubWide.total - clubWide.completed },
  ];

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

const OneTimeProgressSection = ({ byMember }) => {
  if (!byMember || byMember.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No one-time goal data available
      </Typography>
    );
  }

  // Sort by completion rate (descending)
  const sortedMembers = [...byMember].sort((a, b) => b.completionRate - a.completionRate);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {sortedMembers.map((member) => (
        <Box key={member.userId}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2">
              {member.user.displayName || 'Unknown'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {member.completed}/{member.total} ({member.completionRate.toFixed(1)}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={member.completionRate}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      ))}
    </Box>
  );
};

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
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
        const data = await getClubGoalsReport(
          currentClub.id,
          user.uid,
          startDate,
          endDate
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

  const { leaderboard, metrics } = reportData;

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

        {/* Leaderboard Section - At the very top */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Habit Consistency Leaderboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.65rem' }}>
            Average habit completion rate ({formatDateRange(startDate, endDate)})
          </Typography>
          <HabitConsistencyLeaderboard leaderboard={leaderboard} />
        </Box>

        <Typography variant="h4" gutterBottom>
          Club Goals Report
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Track your club's progress and see how everyone is doing with their goals!
        </Typography>

      {/* Charts Grid */}
      <Grid container spacing={3} sx={{ width: '100%', margin: 0 }}>
        {/* Habit Consistency Over Time */}
        <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', minWidth: 0, flexGrow: 1 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', flexGrow: 1 }}>
            <CardContent sx={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
              <Typography variant="h6" gutterBottom>
                Habit Consistency Over Time
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Average consistency rate across all habit goals
              </Typography>
              <HabitConsistencyLineChart timeSeries={metrics.habit.timeSeries} />
            </CardContent>
          </Card>
        </Grid>

        {/* Habit Consistency Comparison */}
        <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', minWidth: 0, flexGrow: 1 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', flexGrow: 1 }}>
            <CardContent sx={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
              <Typography variant="h6" gutterBottom>
                Habit Consistency Comparison
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Current consistency scores by member
              </Typography>
              <HabitConsistencyBarChart byMember={metrics.habit.byMember} />
            </CardContent>
          </Card>
        </Grid>

        {/* Metric Progress Comparison */}
        <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', minWidth: 0, flexGrow: 1 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', flexGrow: 1 }}>
            <CardContent sx={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
              <Typography variant="h6" gutterBottom>
                Metric Progress Comparison
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Average progress percentage for metric goals
              </Typography>
              <MetricProgressBarChart byMember={metrics.metric.byMember} />
            </CardContent>
          </Card>
        </Grid>

        {/* Milestone Completion */}
        <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', minWidth: 0, flexGrow: 1 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', flexGrow: 1 }}>
            <CardContent sx={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
              <Typography variant="h6" gutterBottom>
                Milestone Completion
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Club-wide milestone completion status
              </Typography>
              <MilestoneDonutChart clubWide={metrics.milestone.clubWide} />
            </CardContent>
          </Card>
        </Grid>

        {/* One-Time Goals Completion */}
        <Grid item xs={12} sm={6} md={4} lg={3} sx={{ display: 'flex', minWidth: 0, flexGrow: 1 }}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%', flexGrow: 1 }}>
            <CardContent sx={{ flexGrow: 1, width: '100%', minWidth: 0 }}>
              <Typography variant="h6" gutterBottom>
                One-Time Goals Completion
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Completion rates for one-time goals by member
              </Typography>
              <OneTimeProgressSection byMember={metrics.oneTime.byMember} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default ClubGoalsReport;

