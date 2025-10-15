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
import { fetchCalendarEvents } from '../services/calendarService';
import moment from 'moment';

const NextMeetingCard = () => {
  const [nextEvent, setNextEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const getNextEvent = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const events = await fetchCalendarEvents();
        
        // Find the next upcoming event
        const now = new Date();
        const upcomingEvents = events
          .filter(event => new Date(event.start) > now)
          .sort((a, b) => new Date(a.start) - new Date(b.start));
        
        if (upcomingEvents.length > 0) {
          setNextEvent(upcomingEvents[0]);
        } else {
          setNextEvent(null);
        }
      } catch (err) {
        setError('Failed to fetch next meeting');
      } finally {
        setLoading(false);
      }
    };

    getNextEvent();
  }, []);

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
      <Card>
        <CardContent sx={{ py: 1, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={24} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent sx={{ py: 1 }}>
          <Alert severity="error" size="small">
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!nextEvent) {
    return (
      <Card>
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
    <Card>
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
