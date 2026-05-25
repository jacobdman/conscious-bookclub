import React, { useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ClubMemberSegmentBar from 'components/ClubMemberSegmentBar';
import { getClubGoalMemberBreakdownReport } from 'services/reports/reports.service';
import {
  buildMemberContributionSegments,
  getSharedTotalHeadlines,
} from 'utils/clubGoalReportDisplay';
import ClubGoalSummaryTitle from './ClubGoalSummaryTitle';

const SharedTotalSummary = ({
  clubGoal,
  snapshot,
  userId,
  clubId,
  userTodayActual = 0,
  showTitle = false,
  collapsed = false,
}) => {
  const { data: breakdownData, isLoading } = useQuery({
    queryKey: ['clubGoalBreakdown', clubGoal?.id, clubId, userId],
    queryFn: () => getClubGoalMemberBreakdownReport(clubGoal.id, clubId, userId),
    enabled: Boolean(clubGoal?.id && clubId && userId) && !collapsed,
  });

  const members = breakdownData?.members || [];
  const headlines = useMemo(
    () => getSharedTotalHeadlines(clubGoal, snapshot, { userTodayActual }),
    [clubGoal, snapshot, userTodayActual],
  );

  const isIndividual =
    (clubGoal?.contributionMode ?? clubGoal?.contribution_mode) ===
    'individual_target';

  const membersOnTrack = useMemo(() => {
    if (!isIndividual) return null;
    return members.filter(
      (m) => m.periodCompleted || (Number(m.actual) >= Number(m.target) && Number(m.target) > 0),
    ).length;
  }, [members, isIndividual]);

  const { segments, remainder } = useMemo(() => {
    const target = headlines.target || breakdownData?.effectiveTarget || 0;
    const used = members.reduce((s, m) => s + (Number(m.actual) || 0), 0);
    const segs = buildMemberContributionSegments(members, { totalMax: target });
    return {
      segments: segs,
      remainder: Math.max(0, target - used),
    };
  }, [members, headlines.target, breakdownData?.effectiveTarget]);

  if (collapsed) {
    return (
      <Box sx={{ minWidth: 0 }}>
        {showTitle && <ClubGoalSummaryTitle clubGoal={clubGoal} collapsed />}
        <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
          {headlines.primaryLine}
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
          {headlines.primaryLine}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isIndividual && membersOnTrack != null
            ? `${membersOnTrack} of ${members.length} members hit their target · ${headlines.secondaryLine}`
            : headlines.secondaryLine}
        </Typography>
      </Box>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <Box sx={{ mb: headlines.showDailyContext ? 2 : 0 }}>
          <ClubMemberSegmentBar
            segments={segments}
            remainder={remainder}
            unitSuffix={headlines.unitSuffix}
          />
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

export default SharedTotalSummary;
