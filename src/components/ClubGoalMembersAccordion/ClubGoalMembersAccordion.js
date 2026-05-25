import React, { useMemo } from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Alert,
  Box,
  Stack,
  Chip,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import ProfileAvatar from 'components/ProfileAvatar';
import { getClubGoalMemberBreakdownReport } from 'services/reports/reports.service';
import {
  getClubMemberPeriodContributionLine,
  getClubMemberBudgetStatus,
} from 'utils/clubGoalReportDisplay';

const ClubGoalMembersAccordion = ({ clubGoalId, clubId, userId, enabled = true }) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['clubGoalBreakdown', 'modal', clubGoalId, clubId, userId],
    queryFn: () => getClubGoalMemberBreakdownReport(clubGoalId, clubId, userId),
    enabled: enabled && Boolean(clubGoalId && clubId && userId),
  });

  const clubGoal = data?.clubGoal;
  const fairSharePeriod = data?.fairSharePeriod ?? 0;
  const members = useMemo(() => {
    const rows = data?.members || [];
    return [...rows].sort((a, b) => (Number(b.actual) || 0) - (Number(a.actual) || 0));
  }, [data?.members]);

  return (
    <Accordion
      defaultExpanded={false}
      sx={{ boxShadow: 1, width: '100%', minWidth: 0, overflow: 'hidden', mb: 3 }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{ '& .MuiAccordionSummary-content': { minWidth: 0 } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6">Members</Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Contribution totals for this reporting period
          </Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails sx={{ minWidth: 0, px: { xs: 1, sm: 2 }, pt: 0 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {error.message || 'Failed to load members'}
          </Alert>
        )}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={28} />
          </Box>
        ) : members.length === 0 ? (
          <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
            No members yet
          </Typography>
        ) : (
          <List dense disablePadding>
            {members.map((member) => {
              const budgetStatus = getClubMemberBudgetStatus(
                member,
                fairSharePeriod,
                clubGoal,
              );
              return (
                <ListItem key={member.userId || member.goalId} disableGutters>
                  <ListItemAvatar sx={{ minWidth: 48 }}>
                    <ProfileAvatar
                      user={member.user || { uid: member.userId }}
                      size={36}
                      showEntryRing={false}
                      disableGoalModal
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        flexWrap="wrap"
                        useFlexGap
                      >
                        <Typography component="span" fontWeight={600}>
                          {member.user?.displayName || 'Member'}
                        </Typography>
                        {budgetStatus && (
                          <Chip
                            label={budgetStatus.label}
                            size="small"
                            color={budgetStatus.chipColor}
                            variant={budgetStatus.chipColor === 'default' ? 'outlined' : 'filled'}
                          />
                        )}
                      </Stack>
                    }
                    secondary={getClubMemberPeriodContributionLine(member, clubGoal)}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export default ClubGoalMembersAccordion;
