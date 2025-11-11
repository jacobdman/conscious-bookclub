import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add, Edit } from '@mui/icons-material';
import Layout from 'components/Layout';
import useClubContext from 'contexts/Club';
import { getMeetings } from 'services/meetings/meetings.service';
import MeetingForm from 'components/MeetingForm';
import CalendarSubscription from 'components/CalendarSubscription';
import { format } from 'date-fns';

const Meetings = () => {
  const { currentClub } = useClubContext();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState(null);

  const loadMeetings = useCallback(async () => {
    if (!currentClub) return;

    try {
      setLoading(true);
      setError(null);
      const meetingsList = await getMeetings(currentClub.id);
      setMeetings(meetingsList || []);
    } catch (err) {
      console.error('Error loading meetings:', err);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  }, [currentClub]);

  useEffect(() => {
    if (currentClub) {
      loadMeetings();
    }
  }, [currentClub, loadMeetings]);

  const handleCreateMeeting = () => {
    setEditingMeeting(null);
    setMeetingFormOpen(true);
  };

  const handleEditMeeting = (meeting) => {
    setEditingMeeting(meeting);
    setMeetingFormOpen(true);
  };

  const handleMeetingFormClose = () => {
    setMeetingFormOpen(false);
    setEditingMeeting(null);
  };

  const handleMeetingSaved = () => {
    handleMeetingFormClose();
    loadMeetings();
  };

  if (!currentClub) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">Please select a club to view meetings.</Alert>
        </Box>
      </Layout>
    );
  }

  if (currentClub.role !== 'owner') {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">You must be a club owner to access this page.</Alert>
        </Box>
      </Layout>
    );
  }

  const now = new Date();
  const upcomingMeetings = meetings.filter(m => new Date(m.date) >= now);
  const pastMeetings = meetings.filter(m => new Date(m.date) < now);

  return (
    <Layout>
      <Box sx={{ 
        p: 3, 
        height: '100%', 
        overflowY: 'auto', 
        overflowX: 'hidden' 
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Meetings</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateMeeting}
          >
            Create Meeting
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <CalendarSubscription />

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Upcoming Meetings */}
            {upcomingMeetings.length > 0 && (
              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Upcoming Meetings</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Book</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {upcomingMeetings.map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell>
                            {format(new Date(meeting.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {meeting.book ? (
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {meeting.book.title}
                                </Typography>
                                {meeting.book.author && (
                                  <Typography variant="caption" color="text.secondary">
                                    by {meeting.book.author}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No book selected
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {meeting.location || (
                              <Typography variant="body2" color="text.secondary">
                                No location
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditMeeting(meeting)}
                            >
                              <Edit />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {/* Past Meetings */}
            {pastMeetings.length > 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Past Meetings</Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Book</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pastMeetings.map((meeting) => (
                        <TableRow key={meeting.id}>
                          <TableCell>
                            {format(new Date(meeting.date), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            {meeting.book ? (
                              <Box>
                                <Typography variant="body2" fontWeight="medium">
                                  {meeting.book.title}
                                </Typography>
                                {meeting.book.author && (
                                  <Typography variant="caption" color="text.secondary">
                                    by {meeting.book.author}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No book selected
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            {meeting.location || (
                              <Typography variant="body2" color="text.secondary">
                                No location
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleEditMeeting(meeting)}
                            >
                              <Edit />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            )}

            {meetings.length === 0 && (
              <Paper sx={{ p: 3 }}>
                <Typography variant="body1" color="text.secondary" align="center">
                  No meetings scheduled. Create your first meeting to get started!
                </Typography>
              </Paper>
            )}
          </>
        )}

        <MeetingForm
          open={meetingFormOpen}
          onClose={handleMeetingFormClose}
          onSave={handleMeetingSaved}
          editingMeeting={editingMeeting}
        />
      </Box>
    </Layout>
  );
};

export default Meetings;

