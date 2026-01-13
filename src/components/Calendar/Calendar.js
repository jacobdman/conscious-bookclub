import React, { useState, useEffect, useCallback } from 'react';
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
  useTheme,
  LinearProgress,
} from '@mui/material';
import { CalendarToday, List as ListIcon, LocationOn, AccessTime } from '@mui/icons-material';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getMeetings } from 'services/meetings/meetings.service';
import useClubContext from 'contexts/Club';
import Layout from 'components/Layout';
import CalendarSubscription from 'components/CalendarSubscription';
import { parseLocalDate } from 'utils/dateHelpers';

// Setup moment localizer for react-big-calendar
const localizer = momentLocalizer(moment);

const CalendarComponent = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { currentClub } = useClubContext();
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true); // initial full-page load only
  const [isFetching, setIsFetching] = useState(false); // background fetches (no page blink)
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'month' or 'list'
  const [listFilter, setListFilter] = useState('upcoming'); // 'upcoming' or 'past'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loadedYears, setLoadedYears] = useState(() => {
    const year = new Date().getFullYear();
    return [year];
  });

  const fetchEvents = useCallback(
    async (targetYear, { append = false, showLoader = false } = {}) => {
      if (!currentClub) {
        setError('No club selected');
        setLoading(false);
        return;
      }

      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setIsFetching(true);
        }
        setError(null);

        const startDate = `${targetYear}-01-01`;
        const endDate = `${targetYear}-12-31`;
        const meetings = await getMeetings(currentClub.id, null, startDate, endDate);
        
        // Transform meetings for react-big-calendar
        const transformedEvents = meetings.map(meeting => {
          const getMeetingTitle = () => {
            if (meeting.title) return meeting.title;
            if (meeting.book) {
              let derivedTitle = meeting.book.title;
              if (meeting.book.author) {
                derivedTitle += ` - ${meeting.book.author}`;
              }
              return derivedTitle;
            }
            return 'Book Club Meeting';
          };

          const meetingDate = parseLocalDate(meeting.date);
          
          // If startTime is provided, combine date and time
          let startDateTime = meetingDate;
          let endDateTime = new Date(meetingDate);
          let allDay = true;
          
          if (meeting.startTime) {
            // Parse time string (HH:MM:SS or HH:MM)
            const [hours, minutes] = meeting.startTime.split(':').map(Number);
            startDateTime = new Date(meetingDate);
            startDateTime.setHours(hours, minutes || 0, 0, 0);
            
            // End time is 2 hours after start (default meeting duration)
            endDateTime = new Date(startDateTime);
            endDateTime.setHours(endDateTime.getHours() + 2);
            
            allDay = false;
          } else {
            // For all-day events, use same date for start and end (not next day)
            endDateTime = new Date(meetingDate);
            endDateTime.setHours(23, 59, 59, 999);
          }
          
          return {
            id: meeting.id,
            title: getMeetingTitle(),
            start: startDateTime,
            end: endDateTime,
            resource: {
              description: meeting.notes || '',
              location: meeting.location || '',
              allDay: allDay,
              meeting: meeting
            }
          };
        });
        
        setEvents(prevEvents => {
          if (append) {
            const existingIds = new Set(prevEvents.map(e => e.id));
            const merged = [
              ...prevEvents,
              ...transformedEvents.filter(e => !existingIds.has(e.id)),
            ];
            return merged.sort((a, b) => a.start - b.start);
          }
          return transformedEvents.sort((a, b) => a.start - b.start);
        });

        setLoadedYears(prevYears => {
          if (prevYears.includes(targetYear)) return prevYears;
          return [...prevYears, targetYear];
        });
      } catch (err) {
        console.error('Error fetching meetings:', err);
        setError(err.message || 'Failed to fetch meetings');
      } finally {
        if (showLoader) {
          setLoading(false);
        } else {
          setIsFetching(false);
        }
      }
    },
    [currentClub]
  );

  // Reset events when club changes and load current year with full-page spinner once
  useEffect(() => {
    const targetYear = new Date().getFullYear();
    setEvents([]);
    setLoadedYears([targetYear]);
    setCurrentDate(new Date());
    fetchEvents(targetYear, { showLoader: true });
  }, [currentClub, fetchEvents]);

  // When navigating to a year that hasn't been loaded, fetch and append without blanking the page
  useEffect(() => {
    const targetYear = currentDate.getFullYear();
    if (!loadedYears.includes(targetYear)) {
      fetchEvents(targetYear, { append: true });
    }
  }, [currentDate, loadedYears, fetchEvents]);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const handleListFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setListFilter(newFilter);
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
      ;
  };

  const getPastEvents = () => {
    const now = new Date();
    return events
      .filter(event => event.start < now)
      .sort((a, b) => b.start - a.start);
  };

  const handleLoadMorePast = () => {
    if (loadedYears.length === 0) return;
    const earliestYear = Math.min(...loadedYears);
    const previousYear = earliestYear - 1;
    fetchEvents(previousYear, { append: true });
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
      <Box sx={{ 
        p: 3, 
        height: '100%', 
        overflowY: 'auto', 
        overflowX: 'hidden' 
      }}>
        <CalendarSubscription />

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

        {isFetching && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress />
          </Box>
        )}

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
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>
                {listFilter === 'upcoming' 
                  ? `Upcoming Events (${getUpcomingEvents().length})`
                  : `Past Events (${getPastEvents().length})`}
              </Typography>
              <ToggleButtonGroup
                value={listFilter}
                exclusive
                onChange={handleListFilterChange}
                aria-label="list filter"
                size="small"
              >
                <ToggleButton value="upcoming" aria-label="upcoming events">
                  Upcoming
                </ToggleButton>
                <ToggleButton value="past" aria-label="past events">
                  Past
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
            {(listFilter === 'upcoming' ? getUpcomingEvents() : getPastEvents()).length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" color="text.secondary">
                    {listFilter === 'upcoming' ? 'No upcoming events' : 'No past events'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {listFilter === 'upcoming'
                      ? 'Check back later for new events!'
                      : 'Past events will appear here once meetings have occurred.'}
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Box>
                <List>
                  {(listFilter === 'upcoming' ? getUpcomingEvents() : getPastEvents()).map((event) => (
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
                {listFilter === 'past' && (
                  <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button variant="outlined" onClick={handleLoadMorePast} disabled={isFetching}>
                      Load previous year
                    </Button>
                  </Box>
                )}
              </Box>
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
