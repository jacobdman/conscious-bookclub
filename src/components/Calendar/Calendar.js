import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { CalendarToday, List as ListIcon, LocationOn, AccessTime } from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { fetchCalendarEvents } from 'services/calendarService';
import useClubContext from 'contexts/Club';
import Layout from 'components/Layout';

// Setup moment localizer for react-big-calendar
const localizer = momentLocalizer(moment);

const CalendarComponent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentClub } = useClubContext();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('month'); // 'month' or 'list'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchEvents = async () => {
    if (!currentClub) {
      setError('No club selected');
      setLoading(false);
      return;
    }

    // Check if config exists and has googleCalendarId
    const config = currentClub.config || {};
    const googleCalendarId = config.googleCalendarId;
    
    if (!googleCalendarId) {
      setError('Google Calendar is not configured for this club. Please contact the club owner to configure it in Club Management.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const calendarEvents = await fetchCalendarEvents(googleCalendarId);
      
      // Transform events for react-big-calendar
      const transformedEvents = calendarEvents.map(event => ({
        id: event.id,
        title: event.title,
        start: new Date(event.start),
        end: new Date(event.end),
        resource: {
          description: event.description,
          location: event.location,
          allDay: event.allDay
        }
      }));
      
      setEvents(transformedEvents);
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError(err.message || 'Failed to fetch calendar events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClub]);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setEventDialogOpen(true);
  };

  const handleCloseEventDialog = () => {
    setEventDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  const formatEventTime = (event) => {
    if (event.resource.allDay) {
      return 'All Day';
    }
    return moment(event.start).format('h:mm A');
  };

  const formatEventDate = (event) => {
    return moment(event.start).format('MMM D, YYYY');
  };

  const getUpcomingEvents = () => {
    const now = new Date();
    return events
      .filter(event => event.start >= now)
      .sort((a, b) => a.start - b.start)
      .slice(0, 10); // Show next 10 events
  };

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: theme.palette.primary.main,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Box sx={{ p: 2 }}>
          <Alert 
            severity="error" 
            action={
              <Button color="inherit" size="small" onClick={fetchEvents}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" gutterBottom>
            Calendar
          </Typography>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            aria-label="calendar view"
            size="small"
          >
            <ToggleButton value="month" aria-label="month view">
              <CalendarToday sx={{ mr: 1 }} />
              Month
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <ListIcon sx={{ mr: 1 }} />
              List
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant="body2" gutterBottom>View the full calendar here:</Typography>
          <Button variant="outlined" href="https://calendar.google.com/calendar/embed?src=99d5640c339ece5cf6b5abb26854d93f2cf4b8fc4b87e4a5aa0ca6bb4bc49020%40group.calendar.google.com&ctz=America%2FDenver" target="_blank" size="small">Full Calendar</Button>
        </Box>

        {view === 'month' ? (
          <Paper sx={{ p: 2, height: isMobile ? '600px' : '600px' }}>
            <Calendar
              localizer={localizer}
              events={events}
              startAccessor="start"
              endAccessor="end"
              style={{ height: '100%' }}
              eventPropGetter={eventStyleGetter}
              views={['month']}
              view="month"
              date={currentDate}
              onNavigate={handleNavigate}
              popup
              showMultiDayTimes
              onSelectEvent={handleEventClick}
            />
          </Paper>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              Upcoming Events ({getUpcomingEvents().length})
            </Typography>
            {getUpcomingEvents().length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    No upcoming events
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Check back later for new events!
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <List>
                {getUpcomingEvents().map((event) => (
                  <ListItem 
                    key={event.id} 
                    divider
                    button
                    onClick={() => handleEventClick(event)}
                    sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'action.hover' } }}
                  >
                    <ListItemIcon>
                      <AccessTime color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
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
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatEventDate(event)}
                          </Typography>
                          {event.resource.location && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                              <LocationOn sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                              <Typography variant="caption" color="text.secondary">
                                {event.resource.location}
                              </Typography>
                            </Box>
                          )}
                          {event.resource.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {event.resource.description.replace(/\n/g, '<br />').replace(/<[^>]*>?/g, '')}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </Box>
        )}

        {/* Event Details Dialog */}
        <Dialog
          open={eventDialogOpen}
          onClose={handleCloseEventDialog}
          maxWidth="sm"
          fullWidth
          fullScreen={isMobile}
        >
          {selectedEvent && (
            <>
              <DialogTitle>
                <Typography variant="h5" component="div">
                  {selectedEvent.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatEventDate(selectedEvent)} • {formatEventTime(selectedEvent)}
                </Typography>
              </DialogTitle>
              
              <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedEvent.resource.description && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Description
                      </Typography>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {selectedEvent.resource.description}
                      </Typography>
                    </Box>
                  )}
                  
                  {selectedEvent.resource.location && (
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Location
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn color="primary" />
                        <Typography variant="body2">
                          {selectedEvent.resource.location}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Event Details
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTime color="primary" />
                        <Typography variant="body2">
                          {selectedEvent.resource.allDay ? 'All Day Event' : 
                           `${moment(selectedEvent.start).format('h:mm A')} - ${moment(selectedEvent.end).format('h:mm A')}`}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        Duration: {selectedEvent.resource.allDay ? 'All Day' : 
                                  moment(selectedEvent.end).diff(moment(selectedEvent.start), 'hours', true).toFixed(1) + ' hours'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </DialogContent>
              
              <DialogActions>
                <Button onClick={handleCloseEventDialog} variant="outlined">
                  Close
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Layout>
  );
};

export default CalendarComponent;
