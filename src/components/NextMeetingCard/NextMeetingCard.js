import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  ButtonBase,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { LocationOn, ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
// Components
import MeetingDetailsModal from 'components/MeetingDetailsModal';
// Utils
import { formatMeetingDisplay } from 'utils/meetingTime';

const formatRsvpCaption = (summary) => {
  if (!summary) return null;
  const going = summary.going || 0;
  const notGoing = summary.notGoing || 0;
  const maybe = summary.maybe || 0;
  if (!going && !notGoing && !maybe) return 'No RSVPs yet — tap to respond';
  const parts = [];
  if (going) parts.push(`${going} going`);
  if (notGoing) parts.push(`${notGoing} can't make it`);
  if (maybe) parts.push(`${maybe} not sure`);
  return parts.join(' · ');
};

const NextMeetingCard = ({ meetings = [], loading = false, error = null }) => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [detailMeetingId, setDetailMeetingId] = useState(null);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));

  const detailMeeting = useMemo(
    () => meetings.find((m) => m.id === detailMeetingId) ?? null,
    [meetings, detailMeetingId],
  );

  const upcomingEvents = useMemo(() => {
    const getMeetingTitle = (meeting) => {
      if (meeting.title) return meeting.title;
      if (meeting.book) {
        return `${meeting.book.title}${meeting.book.author ? ` - ${meeting.book.author}` : ''}`;
      }
      return 'Book Club Meeting';
    };

    return meetings.map((meeting) => {
      const display = formatMeetingDisplay({
        date: meeting.date,
        startTime: meeting.startTime,
        timezone: meeting.timezone,
      });

      const showViewerTime =
        display.viewerTime &&
        (display.viewerDate !== display.hostDate || display.viewerTime !== display.hostTime);

      return {
        id: meeting.id,
        title: getMeetingTitle(meeting),
        location: meeting.location || '',
        description: meeting.notes || '',
        hostDate: display.hostDate,
        hostTime: display.hostTime,
        hostLabel: display.hostLabel,
        viewerDate: display.viewerDate,
        viewerTime: display.viewerTime,
        hasStartTime: !!meeting.startTime,
        showViewerTime,
        rsvpSummary: meeting.rsvpSummary || { going: 0, notGoing: 0, maybe: 0 },
      };
    });
  }, [meetings]);

  const scrollByCard = (direction) => {
    const container = scrollRef.current;
    if (!container || container.children.length === 0) return;

    const firstCard = container.children[0];
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = 16; // matches theme spacing(2) default gap
    const offset = direction * (cardWidth + gap);

    container.scrollTo({
      left: container.scrollLeft + offset,
      behavior: 'smooth',
    });
  };

  const scrollToIndex = (index) => {
    const container = scrollRef.current;
    if (!container || container.children.length === 0) return;

    const firstCard = container.children[0];
    const cardWidth = firstCard.getBoundingClientRect().width;
    const gap = 16;
    container.scrollTo({
      left: index * (cardWidth + gap),
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let frame = null;
    const handleScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const firstCard = container.children[0];
        if (!firstCard) return;
        const cardWidth = firstCard.getBoundingClientRect().width;
        const gap = 16;
        const rawIndex = container.scrollLeft / (cardWidth + gap);
        const nextIndex = Math.round(rawIndex);
        setActiveIndex(Math.min(Math.max(nextIndex, 0), upcomingEvents.length - 1));
        frame = null;
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [upcomingEvents.length]);

  if (loading) {
    return (
      <Box sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="h6" gutterBottom>
          Next Meetings
        </Typography>
        <Alert severity="info" size="small">
          {error}
        </Alert>
      </Box>
    );
  }

  if (!upcomingEvents || upcomingEvents.length === 0) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="h6">Next Meetings</Typography>
        <Typography variant="body2" color="text.secondary">
          No upcoming meetings scheduled
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 1 }}>
      <MeetingDetailsModal
        open={Boolean(detailMeeting)}
        onClose={() => setDetailMeetingId(null)}
        meeting={detailMeeting}
      />
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">Next Meetings</Typography>
        {isDesktop && upcomingEvents.length > 1 && (
          <Box>
            <IconButton size="small" aria-label="previous meeting" onClick={() => scrollByCard(-1)}>
              <ArrowBackIosNew fontSize="inherit" />
            </IconButton>
            <IconButton size="small" aria-label="next meeting" onClick={() => scrollByCard(1)}>
              <ArrowForwardIos fontSize="inherit" />
            </IconButton>
          </Box>
        )}
      </Box>

      <Box
        ref={scrollRef}
        sx={{
          display: 'flex',
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
        {upcomingEvents.map((event) => (
          <Box
            key={event.id}
            sx={{
              flex: '0 0 100%',
              scrollSnapAlign: 'start',
            }}
          >
            <ButtonBase
              onClick={() => setDetailMeetingId(event.id)}
              aria-label={`Meeting details: ${event.title}`}
              focusRipple
              sx={{
                width: '100%',
                display: 'block',
                textAlign: 'left',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                backgroundColor: 'background.paper',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {event.title}
                  </Typography>
                  {event.hasStartTime && (
                    <Chip
                      label={`${event.hostTime || ''} ${event.hostLabel ? `(${event.hostLabel})` : ''}`.trim()}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  {event.hostDate}
                </Typography>

                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                  {formatRsvpCaption(event.rsvpSummary)}
                </Typography>

                {event.showViewerTime && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Your time: {event.viewerDate} · {event.viewerTime}
                  </Typography>
                )}

                {event.location && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {event.location}
                    </Typography>
                  </Box>
                )}

                {event.description && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {event.description.replace(/\n/g, ' ').substring(0, 100)}
                    {event.description.length > 100 && '...'}
                  </Typography>
                )}
              </Box>
            </ButtonBase>
          </Box>
        ))}
      </Box>

      {upcomingEvents.length > 1 && (
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
          {upcomingEvents.map((event, index) => (
            <Box
              key={event.id}
              onClick={() => scrollToIndex(index)}
              sx={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                bgcolor: index === activeIndex ? 'primary.main' : 'divider',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default NextMeetingCard;
