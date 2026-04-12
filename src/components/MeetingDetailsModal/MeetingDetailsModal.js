import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Stack,
  Chip,
  Alert,
  IconButton,
  Button,
} from '@mui/material';
import { Close, LocationOn } from '@mui/icons-material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Services
import { setMeetingRsvp } from 'services/meetings/meetings.service';
// Utils
import { formatMeetingDisplay } from 'utils/meetingTime';

const getMeetingTitle = (meeting) => {
  if (!meeting) return '';
  if (meeting.title) return meeting.title;
  if (meeting.book) {
    return `${meeting.book.title}${meeting.book.author ? ` — ${meeting.book.author}` : ''}`;
  }
  return 'Book Club Meeting';
};

const MeetingDetailsModal = ({ open, onClose, meeting }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const queryClient = useQueryClient();

  const clubId = currentClub?.id;
  const userId = user?.uid;

  const mutation = useMutation({
    mutationFn: (status) => {
      if (!meeting?.id) {
        return Promise.reject(new Error('No meeting selected'));
      }
      return setMeetingRsvp(userId, clubId, meeting.id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings', clubId, userId] });
    },
  });

  if (!meeting) {
    return null;
  }

  const display = formatMeetingDisplay({
    date: meeting.date,
    startTime: meeting.startTime,
    timezone: meeting.timezone,
  });

  const showViewerTime =
    display.viewerTime &&
    (display.viewerDate !== display.hostDate || display.viewerTime !== display.hostTime);

  const myRsvp = meeting.myRsvp ?? null;
  const canRsvp = Boolean(clubId && userId);

  const rsvpOptions = [
    { status: 'going', label: "I'll be there" },
    { status: 'not_going', label: "Can't make it" },
    { status: 'maybe', label: 'Not sure yet' },
  ];

  return (
    <Dialog open={open && !!meeting} onClose={onClose} maxWidth="sm" fullWidth scroll="paper">
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 1,
          pr: 1,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" component="div">
            {getMeetingTitle(meeting)}
          </Typography>
          {meeting.startTime && (
            <Chip
              label={`${display.hostTime || ''} ${display.hostLabel ? `(${display.hostLabel})` : ''}`.trim()}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ mt: 1 }}
            />
          )}
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {display.hostDate}
        </Typography>

        {showViewerTime && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Your time: {display.viewerDate} · {display.viewerTime}
          </Typography>
        )}

        {meeting.location && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 2 }}>
            <LocationOn sx={{ fontSize: 18, color: 'text.secondary', mt: 0.25 }} />
            <Typography variant="body2" color="text.secondary">
              {meeting.location}
            </Typography>
          </Box>
        )}

        {meeting.notes ? (
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mb: 2 }}>
            {meeting.notes}
          </Typography>
        ) : null}

        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Your RSVP
        </Typography>

        {mutation.isError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {mutation.error?.message || 'Could not save RSVP. Try again.'}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          {rsvpOptions.map(({ status, label }) => (
            <Button
              key={status}
              fullWidth
              variant={myRsvp === status ? 'contained' : 'outlined'}
              disabled={!canRsvp || mutation.isPending}
              onClick={() => mutation.mutate(status)}
            >
              {label}
            </Button>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default MeetingDetailsModal;
