import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import { LocationOn, ArrowBackIosNew, ArrowForwardIos } from '@mui/icons-material';
import { useTheme, useMediaQuery } from '@mui/material';
import moment from 'moment';
import { parseLocalDate } from 'utils/dateHelpers';

const NextMeetingCard = ({ meetings = [], loading = false, error = null }) => {
  const scrollRef = useRef(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('sm'));

  const upcomingEvents = useMemo(() => {
    const getMeetingTitle = (meeting) => {
      if (meeting.title) return meeting.title;
      if (meeting.book) {
        return `${meeting.book.title}${meeting.book.author ? ` - ${meeting.book.author}` : ''}`;
      }
      return 'Book Club Meeting';
    };

    return meetings.map((meeting) => {
      const meetingDate = parseLocalDate(meeting.date);
      return {
        id: meeting.id,
        title: getMeetingTitle(meeting),
        start: meetingDate.toISOString(),
        location: meeting.location || '',
        description: meeting.notes || '',
        allDay: true,
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

  const formatEventTime = (event) => {
    if (event.allDay) {
      return 'All Day';
    }
    return moment(event.start).format('h:mm A');
  };

  const formatEventDate = (event) => {
    return moment(event.start).format('MMM D, YYYY');
  };

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
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              backgroundColor: 'background.paper',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="medium">
                {event.title}
              </Typography>
              <Chip
                label={formatEventTime(event)}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {formatEventDate(event)}
            </Typography>

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
