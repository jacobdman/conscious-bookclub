import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { getMeetings } from 'services/meetings/meetings.service';
import useClubContext from 'contexts/Club';
import moment from 'moment';

const NextMeetingCard = () => {
  const { currentClub } = useClubContext();
  const [nextEvent, setNextEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getNextEvent = async () => {
      if (!currentClub) {
        setLoading(false);
        setError(null);
        setNextEvent(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const meetings = await getMeetings(currentClub.id);
        
        // Find the next upcoming meeting
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset to start of day for DATEONLY comparison
        
        const upcomingMeetings = meetings
          .filter(meeting => {
            const meetingDate = new Date(meeting.date);
            meetingDate.setHours(0, 0, 0, 0);
            return meetingDate >= now;
          })
          .sort((a, b) => new Date(a.date) - new Date(b.date));
        
        if (upcomingMeetings.length > 0) {
          const nextMeeting = upcomingMeetings[0];
          // Transform meeting to event-like format for compatibility
          const meetingDate = new Date(nextMeeting.date);
          setNextEvent({
            id: nextMeeting.id,
            title: nextMeeting.book ? 
              `${nextMeeting.book.title}${nextMeeting.book.author ? ` - ${nextMeeting.book.author}` : ''}` : 
              'Book Club Meeting',
            start: meetingDate.toISOString(),
            location: nextMeeting.location || '',
            description: nextMeeting.notes || '',
            allDay: true
          });
        } else {
          setNextEvent(null);
        }
      } catch (err) {
        setError(err.message || 'Failed to fetch next meeting');
        console.error('Error fetching next meeting:', err);
        setNextEvent(null);
      } finally {
        setLoading(false);
      }
    };

    getNextEvent();
  }, [currentClub]);

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
      <Card sx={{ overflow: 'visible' }}>
        <CardContent sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ overflow: 'visible' }}>
        <CardContent sx={{ py: 1 }}>
          <Typography variant="h6" gutterBottom>
            Next Meeting
          </Typography>
          <Alert severity="info" size="small">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!nextEvent) {
    return (
      <Card sx={{ overflow: 'visible' }}>
        <CardContent sx={{ py: 1 }}>
          <Typography variant="h6">Next Meeting</Typography>
          <Typography variant="body2" color="text.secondary">
            No upcoming meetings scheduled
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ overflow: 'visible' }}>
      <CardContent sx={{ py: 1 }}>
        <Typography variant="h6" gutterBottom>
          Next Meeting
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="subtitle1" fontWeight="medium">
            {nextEvent.title}
          </Typography>
          <Chip 
            label={formatEventTime(nextEvent)} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {formatEventDate(nextEvent)}
        </Typography>
        
        {nextEvent.location && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="caption" color="text.secondary">
              {nextEvent.location}
            </Typography>
          </Box>
        )}
        
        {nextEvent.description && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            {nextEvent.description.replace(/\n/g, ' ').substring(0, 100)}
            {nextEvent.description.length > 100 && '...'}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default NextMeetingCard;
