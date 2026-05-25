import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  resolveClubGoalLayout,
  CLUB_GOAL_LAYOUT,
  getClubGoalDashboardProgress,
  getClubGoalCollapsedHeadline,
} from 'utils/clubGoalReportDisplay';
import RemainingBudgetSummary from 'components/RemainingBudgetSummary';
import SharedTotalSummary from './SharedTotalSummary';
import HabitClubSummary from './HabitClubSummary';
import OneTimeClubSummary from './OneTimeClubSummary';
import MilestoneClubSummary from './MilestoneClubSummary';
import ClubGoalSummaryTitle from './ClubGoalSummaryTitle';

const ClubGoalDashboardSummary = ({
  clubGoal,
  snapshot,
  userId,
  clubId,
  userTodayActual = 0,
  personalActual = 0,
  personalTarget = 0,
  showTitle = true,
  collapsed = false,
}) => {
  const layout = resolveClubGoalLayout(clubGoal);
  const common = {
    clubGoal,
    snapshot,
    userId,
    clubId,
    showTitle,
    collapsed,
  };

  switch (layout) {
    case CLUB_GOAL_LAYOUT.REMAINING_BUDGET:
      return (
        <RemainingBudgetSummary
          {...common}
          userTodayActual={userTodayActual}
        />
      );
    case CLUB_GOAL_LAYOUT.SHARED_TOTAL:
      return (
        <SharedTotalSummary
          {...common}
          userTodayActual={userTodayActual}
        />
      );
    case CLUB_GOAL_LAYOUT.HABIT:
      return (
        <HabitClubSummary
          {...common}
          personalActual={personalActual}
          personalTarget={personalTarget}
        />
      );
    case CLUB_GOAL_LAYOUT.ONE_TIME:
      return <OneTimeClubSummary {...common} />;
    case CLUB_GOAL_LAYOUT.MILESTONE:
      return <MilestoneClubSummary {...common} />;
    default: {
      const progress = getClubGoalDashboardProgress(clubGoal, snapshot);
      if (collapsed) {
        return (
          <Box sx={{ minWidth: 0 }}>
            {showTitle && <ClubGoalSummaryTitle clubGoal={clubGoal} collapsed />}
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {getClubGoalCollapsedHeadline(clubGoal, snapshot)}
            </Typography>
          </Box>
        );
      }
      return (
        <Box sx={{ minWidth: 0 }}>
          {showTitle && <ClubGoalSummaryTitle clubGoal={clubGoal} />}
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
            {progress.headline}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {progress.subline}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={progress.barValue}
            color={progress.barColor}
            sx={{ height: 14, borderRadius: 2, backgroundColor: 'action.hover' }}
          />
        </Box>
      );
    }
  }
};

export default ClubGoalDashboardSummary;
