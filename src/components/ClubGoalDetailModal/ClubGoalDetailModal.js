import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  LinearProgress,
  CircularProgress,
  Alert,
  DialogTitle,
  DialogContent,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import FullscreenDialog from 'UI/FullscreenDialog';
import {
  getClubGoalProgressReport,
  getClubGoalMemberBreakdownReport,
} from 'services/reports/reports.service';
import { getGoalTypeLabel } from 'utils/goalHelpers';
import { formatClubGoalQuantity } from 'utils/clubGoalReportDisplay';

const ClubGoalDetailModal = ({ open, onClose, clubGoalId }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();

  const enabled = open && !!clubGoalId && !!user?.uid && !!currentClub?.id;

  const { data: progressData, isLoading: loadingP, error: errP } = useQuery({
    queryKey: ['clubGoalProgress', clubGoalId, currentClub?.id, user?.uid],
    queryFn: () => getClubGoalProgressReport(clubGoalId, currentClub.id, user.uid),
    enabled,
  });

  const { data: breakdownData, isLoading: loadingB, error: errB } = useQuery({
    queryKey: ['clubGoalBreakdown', clubGoalId, currentClub?.id, user?.uid],
    queryFn: () => getClubGoalMemberBreakdownReport(clubGoalId, currentClub.id, user.uid),
    enabled,
  });

  const loading = loadingP || loadingB;
  const err = errP || errB;
  const clubGoal = progressData?.clubGoal || breakdownData?.clubGoal;
  const aggregate = progressData?.aggregate;
  const members = breakdownData?.members || [];

  const pct = aggregate && typeof aggregate.percent === 'number' ? Math.min(100, Math.max(0, aggregate.percent)) : 0;

  const unitSuffix = (clubGoal?.unit || '').trim();
  const unitSp = unitSuffix ? ` ${unitSuffix}` : '';
  const showMemberMetricAmounts =
    clubGoal?.type === 'metric' &&
    (clubGoal.progressDirection === 'stay_under' || clubGoal.progressDirection === 'decrease');

  return (
    <FullscreenDialog open={open} onClose={onClose} PaperProps={{ sx: { backgroundColor: 'background.default' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="span">
          {clubGoal?.title || 'Club goal'}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {clubGoal && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {getGoalTypeLabel({ type: clubGoal.type, cadence: clubGoal.cadence })}
          </Typography>
        )}

        {err && (
          <Alert severity="error" sx={{ my: 2 }}>
            {err.message || 'Failed to load details'}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {aggregate && (
              <Box sx={{ my: 2 }}>
                <Typography variant="subtitle2">Club progress</Typography>
                <Typography variant="body2">
                  {aggregate.label === 'members_completed_period' &&
                    `${aggregate.completedMembers ?? aggregate.actual} / ${aggregate.totalMembers ?? aggregate.target} members this period`}
                  {aggregate.label === 'sum_quantity' &&
                    `${formatClubGoalQuantity(aggregate.actual)} / ${formatClubGoalQuantity(aggregate.target)}${unitSp}`}
                  {aggregate.label === 'remaining_budget' &&
                    `${formatClubGoalQuantity(aggregate.actual)} / ${formatClubGoalQuantity(aggregate.target)}${unitSp} logged vs cap (${formatClubGoalQuantity(Math.max(0, Number(aggregate.target) - Number(aggregate.actual)))}${unitSp} left)`}
                  {aggregate.label === 'members_completed' &&
                    `${aggregate.completedMembers ?? aggregate.actual} / ${aggregate.totalMembers ?? aggregate.target} completed`}
                  {aggregate.label === 'milestones_done' &&
                    `${aggregate.actual} / ${aggregate.target} milestones done`}
                </Typography>
                <LinearProgress variant="determinate" value={pct} sx={{ mt: 1, height: 8, borderRadius: 1 }} />
              </Box>
            )}

            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              Members
            </Typography>
            <List dense>
              {members.map((m) => (
                <ListItem key={m.userId || m.goalId}>
                  <ListItemAvatar>
                    <Avatar src={m.user?.photoUrl || undefined}>{(m.user?.displayName || '?').slice(0, 1)}</Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={m.user?.displayName || m.userId}
                    secondary={
                      showMemberMetricAmounts
                        ? `${formatClubGoalQuantity(m.actual)} / ${formatClubGoalQuantity(m.target)}${unitSp} · goal #${m.goalId}`
                        : `${Math.round(m.percent ?? 0)}% · goal #${m.goalId}`
                    }
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </FullscreenDialog>
  );
};

export default ClubGoalDetailModal;
