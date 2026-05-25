import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useGoalsContext from 'contexts/Goals';
import { getClubGoalOverviewReport } from 'services/reports/reports.service';
import { updateUserProfile } from 'services/users/users.service';
import { getTodayEntries, getGoalTargetValue } from 'utils/goalHelpers';
import GoalDetailsModal from 'components/Goals/GoalDetailsModal';
import ClubGoalDashboardSummary from './ClubGoalDashboardSummary';

const DashboardClubGoals = () => {
  const { user, userProfile, setUserProfile } = useAuth();
  const { currentClub } = useClubContext();
  const { goals } = useGoalsContext();
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [detailsGoal, setDetailsGoal] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsCollapsed(false);
      return;
    }
    const collapsed = userProfile?.settings?.clubGoalsCollapsed ?? false;
    setIsCollapsed(Boolean(collapsed));
  }, [user, userProfile]);

  const handleCollapseToggle = async (event) => {
    event.stopPropagation();
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    if (!user) return;
    try {
      const updatedUser = await updateUserProfile(user.uid, {
        settings: { clubGoalsCollapsed: nextCollapsed },
      });
      if (updatedUser) {
        setUserProfile(updatedUser);
      }
    } catch (err) {
      console.error('Failed to save club goals collapse preference:', err);
      setIsCollapsed(!nextCollapsed);
    }
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['clubGoalOverview', 'dashboard', user?.uid, currentClub?.id],
    queryFn: () => getClubGoalOverviewReport(currentClub.id, user.uid),
    enabled: !!user?.uid && !!currentClub?.id,
  });

  const clubGoals = useMemo(() => data?.clubGoals || [], [data]);

  useEffect(() => {
    setActiveIndex(0);
  }, [currentClub?.id, clubGoals.length]);

  const scrollToIndex = useCallback((index) => {
    const container = scrollRef.current;
    if (!container || container.children.length === 0) return;
    const firstCard = container.children[0];
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = 16;
    container.scrollTo({
      left: index * (cardWidth + gap),
      behavior: 'smooth',
    });
  }, []);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let frame = null;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const firstCard = container.children[0];
        if (!firstCard) {
          frame = null;
          return;
        }
        const cardWidth = firstCard.getBoundingClientRect().width;
        const gap = 16;
        const rawIndex = container.scrollLeft / (cardWidth + gap);
        const nextIndex = Math.round(rawIndex);
        setActiveIndex(
          Math.min(Math.max(nextIndex, 0), Math.max(clubGoals.length - 1, 0)),
        );
        frame = null;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [clubGoals.length]);

  const handleCardClick = (clubGoal) => {
    if (!clubGoal) return;
    const linked = goals.find(
      (g) => Number(g.clubGoalId) === Number(clubGoal.id) && !g.archived,
    );
    if (linked) {
      setDetailsGoal(linked);
    }
  };

  if (!currentClub) {
    return null;
  }

  if (isLoading) {
    return (
      <Paper elevation={1} sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error.message || 'Failed to load club goals'}
      </Alert>
    );
  }

  if (clubGoals.length === 0) {
    return null;
  }

  return (
    <>
      <Box data-tour="dashboard-club-goals">
        <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Club goals
        </Typography>

        <Box
          ref={scrollRef}
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            gap: 2,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            px: 0.5,
            scrollbarWidth: 'none',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {clubGoals.map((cg) => {
            const linked = goals.find(
              (g) => Number(g.clubGoalId) === Number(cg.id) && !g.archived,
            );
            const canLog = Boolean(linked);
            const todayActual =
              linked && linked.type === 'metric'
                ? getTodayEntries(linked.entries || []).reduce(
                    (s, e) => s + (parseFloat(e.quantity) || 0),
                    0,
                  )
                : 0;
            const personalActual =
              linked?.progress?.actual != null
                ? Number(linked.progress.actual)
                : 0;
            const personalTarget = linked ? getGoalTargetValue(linked) : 0;

            return (
              <Box
                key={cg.id}
                sx={{
                  flex: '0 0 100%',
                  scrollSnapAlign: 'start',
                  minWidth: 0,
                  display: 'flex',
                }}
              >
                <Paper
                  elevation={2}
                  onClick={() => handleCardClick(cg)}
                  sx={{
                    p: 2,
                    cursor: canLog ? 'pointer' : 'default',
                    borderRadius: 2,
                    minWidth: 0,
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    '&:hover': canLog
                      ? {
                          backgroundColor: 'action.hover',
                        }
                      : undefined,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <ClubGoalDashboardSummary
                        clubGoal={cg}
                        snapshot={cg?.snapshot}
                        userId={user?.uid}
                        clubId={currentClub?.id}
                        userTodayActual={todayActual}
                        personalActual={personalActual}
                        personalTarget={personalTarget}
                        collapsed={isCollapsed}
                      />
                      {!isCollapsed && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: 'block', mt: 1.5 }}
                        >
                          {canLog
                            ? 'Tap to log or view details'
                            : 'Your club goal is not available yet'}
                        </Typography>
                      )}
                    </Box>
                    <IconButton
                      aria-label={isCollapsed ? 'Expand club goal' : 'Collapse club goal'}
                      aria-expanded={!isCollapsed}
                      onClick={handleCollapseToggle}
                      size="small"
                      sx={{ mt: -0.5, flexShrink: 0 }}
                    >
                      <ExpandMore
                        sx={{
                          transform: isCollapsed ? 'rotate(0deg)' : 'rotate(180deg)',
                          transition: 'transform 0.2s ease',
                        }}
                      />
                    </IconButton>
                  </Box>
                </Paper>
              </Box>
            );
          })}
        </Box>

        {clubGoals.length > 1 && (
          <Box
            sx={{
              mt: 1.5,
              display: 'flex',
              justifyContent: 'center',
              gap: 1,
            }}
            aria-label={`Club goal ${activeIndex + 1} of ${clubGoals.length}`}
          >
            {clubGoals.map((cg, i) => (
              <Box
                key={cg.id}
                onClick={() => scrollToIndex(i)}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: i === activeIndex ? 'primary.main' : 'divider',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </Box>
        )}
      </Box>

      <GoalDetailsModal
        open={Boolean(detailsGoal)}
        onClose={() => setDetailsGoal(null)}
        goal={detailsGoal}
      />
    </>
  );
};

export default DashboardClubGoals;
