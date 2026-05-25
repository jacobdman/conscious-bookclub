import React, { useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import ClubMemberAvatarRow from 'components/ClubMemberAvatarRow';
import { getClubGoalMemberBreakdownReport } from 'services/reports/reports.service';
import {
  getOneTimeClubHeadlines,
  getMemberAvatarStatus,
} from 'utils/clubGoalReportDisplay';
import ClubGoalSummaryTitle from './ClubGoalSummaryTitle';

const OneTimeClubSummary = ({
  clubGoal,
  snapshot,
  userId,
  clubId,
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
    () => getOneTimeClubHeadlines(clubGoal, snapshot),
    [clubGoal, snapshot],
  );

  const avatarMembers = useMemo(
    () =>
      members.map((m) => ({
        userId: m.userId,
        user: m.user || { uid: m.userId },
        name: m.user?.displayName || 'Member',
        status: getMemberAvatarStatus(m, clubGoal),
      })),
    [members, clubGoal],
  );

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
          {headlines.secondaryLine}
        </Typography>
      </Box>
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <ClubMemberAvatarRow
          members={avatarMembers}
          emptyMessage="No members have completed this yet"
        />
      )}
    </Box>
  );
};

export default OneTimeClubSummary;
