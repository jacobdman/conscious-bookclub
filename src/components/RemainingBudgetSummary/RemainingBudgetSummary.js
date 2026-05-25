import React, { useMemo } from 'react';
import { Box, Typography, Stack, CircularProgress, Chip } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ClubMemberSegmentBar from 'components/ClubMemberSegmentBar';
import { getClubGoalMemberBreakdownReport } from 'services/reports/reports.service';
import {
  buildMemberContributionSegments,
  getRemainingBudgetHeadlines,
  getRemainingBudgetInsight,
} from 'utils/clubGoalReportDisplay';
import ClubGoalSummaryTitle from 'components/DashboardClubGoals/ClubGoalSummaryTitle';

const RemainingBudgetSummary = ({
  clubGoal,
  snapshot,
  userId,
  clubId,
  userTodayActual = 0,
  showTitle = false,
  collapsed = false,
}) => {
  const { data: breakdownData, isLoading: breakdownLoading } = useQuery({
    queryKey: ['clubGoalBreakdown', clubGoal?.id, clubId, userId],
    queryFn: () => getClubGoalMemberBreakdownReport(clubGoal.id, clubId, userId),
    enabled: Boolean(clubGoal?.id && clubId && userId) && !collapsed,
  });

  const breakdown = breakdownData || {};
  const members = breakdown.members || [];
  const headlines = useMemo(
    () => getRemainingBudgetHeadlines(clubGoal, snapshot, { userTodayActual }),
    [clubGoal, snapshot, userTodayActual],
  );

  const unit = (clubGoal?.unit || '').trim();
  const unitSuffix = unit ? ` ${unit}` : '';

  const insight = useMemo(
    () =>
      collapsed
        ? null
        : getRemainingBudgetInsight({ snapshot, breakdown, clubGoal }),
    [collapsed, snapshot, breakdown, clubGoal],
  );

  const { segments, remainder } = useMemo(() => {
    const totalBudget = headlines.target || breakdown.effectiveTarget || 0;
    const used = members.reduce((sum, m) => sum + (Number(m.actual) || 0), 0);
    return {
      segments: buildMemberContributionSegments(members, { totalMax: totalBudget }),
      remainder: Math.max(0, totalBudget - used),
    };
  }, [members, headlines.target, breakdown.effectiveTarget]);

  if (collapsed) {
    return (
      <Box sx={{ minWidth: 0 }}>
        {showTitle && <ClubGoalSummaryTitle clubGoal={clubGoal} collapsed />}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {headlines.remainingPeriodLine}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      {showTitle && <ClubGoalSummaryTitle clubGoal={clubGoal} />}

      <Box sx={{ mb: 1.5 }}>
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: 'block', letterSpacing: 1, mb: 0.25, lineHeight: 1.2 }}
        >
          {headlines.periodOverline}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
          {headlines.remainingPeriodLine}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {headlines.usedOverTotalLine}
        </Typography>
      </Box>

      {breakdownLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box sx={{ mb: insight || headlines.showDailyContext ? 1.5 : 0 }}>
          <ClubMemberSegmentBar
            segments={segments}
            remainder={remainder}
            unitSuffix={unitSuffix}
          />
          {insight && (
            <Stack direction="row" justifyContent="center" sx={{ mt: 1 }}>
              <Chip label={insight} size="small" variant="outlined" />
            </Stack>
          )}
        </Box>
      )}

      {headlines.showDailyContext && (
        <Box sx={{ pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ display: 'block', letterSpacing: 1, mb: 0.75 }}
          >
            Today
          </Typography>
          {headlines.remainingTodayLine && (
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
              {headlines.remainingTodayLine}
            </Typography>
          )}
          {headlines.youLoggedLine && (
            <Typography variant="body2" color="text.secondary">
              {headlines.youLoggedLine}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default RemainingBudgetSummary;
