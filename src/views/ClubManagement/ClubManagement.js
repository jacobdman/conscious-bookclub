import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  Alert,
  CircularProgress,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Delete, Edit, Add, Save, Cancel, ContentCopy, Refresh } from '@mui/icons-material';
import Layout from 'components/Layout';
import useClubContext from 'contexts/Club';
import { useAuth } from 'AuthContext';
import {
  updateClub,
  addClubMember,
  removeClubMember,
  updateMemberRole,
  deleteClub,
  rotateInviteCode,
} from 'services/clubs/clubs.service';
import { useNavigate } from 'react-router-dom';

const ClubManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentClub, refreshClubs, refreshClubMembers } = useClubContext();
  const [editingName, setEditingName] = useState(false);
  const [clubName, setClubName] = useState('');
  const [editingCalendarId, setEditingCalendarId] = useState(false);
  const [googleCalendarId, setGoogleCalendarId] = useState('');
  const [defaultNotifyOneDay, setDefaultNotifyOneDay] = useState(false);
  const [defaultNotifyOneWeek, setDefaultNotifyOneWeek] = useState(false);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [rotateDialog, setRotateDialog] = useState(false);

  const loadMembers = useCallback(async () => {
    if (!currentClub || !user) return;

    try {
      setLoading(true);
      setError(null);
      const membersList = await refreshClubMembers(currentClub.id);
      setMembers(membersList || []);
    } catch (err) {
      setError('Failed to load members');
      console.error('Error loading members:', err);
    } finally {
      setLoading(false);
    }
  }, [currentClub, user, refreshClubMembers]);

  useEffect(() => {
    if (currentClub) {
      setClubName(currentClub.name);
      setGoogleCalendarId(currentClub.config?.googleCalendarId || '');
      setDefaultNotifyOneDay(currentClub.config?.defaultMeetingNotifyOneDayBefore || false);
      setDefaultNotifyOneWeek(currentClub.config?.defaultMeetingNotifyOneWeekBefore || false);
      loadMembers();
    }
  }, [currentClub, loadMembers]);

  const handleSaveName = async () => {
    if (!currentClub || !user) return;

    try {
      await updateClub(currentClub.id, user.uid, { name: clubName });
      setEditingName(false);
      await refreshClubs();
    } catch (err) {
      setError('Failed to update club name');
      console.error('Error updating club name:', err);
    }
  };

  const handleSaveCalendarId = async () => {
    if (!currentClub || !user) return;

    try {
      const currentConfig = currentClub.config || {};
      const updatedConfig = {
        ...currentConfig,
        googleCalendarId: googleCalendarId.trim() || null,
      };
      await updateClub(currentClub.id, user.uid, { config: updatedConfig });
      setEditingCalendarId(false);
      await refreshClubs();
    } catch (err) {
      setError('Failed to update Google Calendar ID');
      console.error('Error updating Google Calendar ID:', err);
    }
  };

  const handleSaveMeetingDefaults = async () => {
    if (!currentClub || !user) return;

    try {
      const currentConfig = currentClub.config || {};
      const updatedConfig = {
        ...currentConfig,
        defaultMeetingNotifyOneDayBefore: defaultNotifyOneDay,
        defaultMeetingNotifyOneWeekBefore: defaultNotifyOneWeek,
      };
      await updateClub(currentClub.id, user.uid, { config: updatedConfig });
      await refreshClubs();
    } catch (err) {
      setError('Failed to update meeting notification defaults');
      console.error('Error updating meeting notification defaults:', err);
    }
  };

  const handleAddMember = async () => {
    if (!currentClub || !user || !newMemberId.trim()) return;

    try {
      await addClubMember(currentClub.id, user.uid, newMemberId.trim());
      setNewMemberId('');
      setAddMemberDialog(false);
      await loadMembers();
    } catch (err) {
      setError('Failed to add member');
      console.error('Error adding member:', err);
    }
  };

  const handleRemoveMember = async (memberUserId) => {
    if (!currentClub || !user) return;

    try {
      await removeClubMember(currentClub.id, user.uid, memberUserId);
      await loadMembers();
    } catch (err) {
      setError('Failed to remove member');
      console.error('Error removing member:', err);
    }
  };

  const handleUpdateRole = async (memberUserId, newRole) => {
    if (!currentClub || !user) return;

    try {
      await updateMemberRole(currentClub.id, user.uid, memberUserId, newRole);
      await loadMembers();
    } catch (err) {
      setError('Failed to update role');
      console.error('Error updating role:', err);
    }
  };

  const handleDeleteClub = async () => {
    if (!currentClub || !user) return;

    try {
      await deleteClub(currentClub.id, user.uid);
      await refreshClubs();
      navigate('/');
    } catch (err) {
      setError('Failed to delete club');
      console.error('Error deleting club:', err);
    }
  };

  const handleCopyInviteCode = () => {
    if (currentClub?.inviteCode) {
      navigator.clipboard.writeText(currentClub.inviteCode);
      // Could show a toast notification here
    }
  };

  const handleRotateInviteCode = async () => {
    if (!currentClub || !user) return;

    try {
      await rotateInviteCode(currentClub.id, user.uid);
      await refreshClubs();
      setRotateDialog(false);
      // The invite code will be updated in currentClub after refreshClubs
    } catch (err) {
      setError('Failed to rotate invite code');
      console.error('Error rotating invite code:', err);
      setRotateDialog(false);
    }
  };

  if (!currentClub) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">Please select a club to manage.</Alert>
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

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" sx={{ mb: 3 }}>Manage Club</Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Club Name Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Club Name</Typography>
          {editingName ? (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                value={clubName}
                onChange={(e) => setClubName(e.target.value)}
                fullWidth
                size="small"
              />
              <IconButton color="primary" onClick={handleSaveName}>
                <Save />
              </IconButton>
              <IconButton onClick={() => {
                setEditingName(false);
                setClubName(currentClub.name);
              }}>
                <Cancel />
              </IconButton>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Typography variant="body1">{clubName}</Typography>
              <IconButton size="small" onClick={() => setEditingName(true)}>
                <Edit />
              </IconButton>
            </Box>
          )}
        </Paper>

        {/* Google Calendar ID Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Google Calendar</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Configure a Google Calendar ID to display events in the Calendar view. 
            You can find your calendar ID in your Google Calendar settings.
          </Typography>
          {editingCalendarId ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Google Calendar ID"
                value={googleCalendarId}
                onChange={(e) => setGoogleCalendarId(e.target.value)}
                fullWidth
                size="small"
                placeholder="e.g., abc123@group.calendar.google.com"
                helperText="Enter the full Google Calendar ID"
              />
              <Box sx={{ display: 'flex', gap: 2 }}>
                <IconButton color="primary" onClick={handleSaveCalendarId}>
                  <Save />
                </IconButton>
                <IconButton onClick={() => {
                  setEditingCalendarId(false);
                  setGoogleCalendarId(currentClub.config?.googleCalendarId || '');
                }}>
                  <Cancel />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  flex: 1,
                  wordBreak: 'break-all',
                  overflowWrap: 'break-word',
                  minWidth: 0, // Allows flex item to shrink below content size
                }}
              >
                {googleCalendarId || 'Not configured'}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => setEditingCalendarId(true)}
                sx={{ flexShrink: 0 }}
              >
                <Edit />
              </IconButton>
            </Box>
          )}
        </Paper>

        {/* Invite Code Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Invite Code</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Share this code with others to allow them to join your club. You can rotate the code at any time for security.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              value={currentClub.inviteCode || ''}
              fullWidth
              size="small"
              InputProps={{
                readOnly: true,
              }}
              sx={{
                '& .MuiInputBase-input': {
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                },
              }}
            />
            <IconButton
              color="primary"
              onClick={handleCopyInviteCode}
              title="Copy invite code"
            >
              <ContentCopy />
            </IconButton>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => setRotateDialog(true)}
              size="small"
            >
              Rotate
            </Button>
          </Box>
        </Paper>

        {/* Default Meeting Notifications Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Default Meeting Notifications</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set default notification preferences for new meetings. These will be pre-selected when creating meetings, but can be changed per meeting.
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={defaultNotifyOneWeek}
                  onChange={(e) => setDefaultNotifyOneWeek(e.target.checked)}
                />
              }
              label="Notify members 1 week before meeting (default)"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={defaultNotifyOneDay}
                  onChange={(e) => setDefaultNotifyOneDay(e.target.checked)}
                />
              }
              label="Notify members 1 day before meeting (default)"
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button
                variant="contained"
                onClick={handleSaveMeetingDefaults}
                size="small"
              >
                Save Defaults
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Members Section */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Members</Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddMemberDialog(true)}
            >
              Add Member
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {members.map((member) => (
                <ListItem key={member.userId}>
                  <ListItemText
                    primary={member.user.displayName || member.user.email}
                    secondary={member.user.email}
                  />
                  <ListItemSecondaryAction>
                    <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
                      <Select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                      >
                        <MenuItem value="member">Member</MenuItem>
                        <MenuItem value="owner">Owner</MenuItem>
                      </Select>
                    </FormControl>
                    {member.userId !== user.uid && (
                      <IconButton
                        edge="end"
                        color="error"
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>

        {/* Delete Club Section */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'error.main' }}>Danger Zone</Typography>
          <Button
            variant="outlined"
            color="error"
            onClick={() => setDeleteDialog(true)}
          >
            Delete Club
          </Button>
        </Paper>

        {/* Add Member Dialog */}
        <Dialog open={addMemberDialog} onClose={() => setAddMemberDialog(false)}>
          <DialogTitle>Add Member</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="User ID"
              fullWidth
              variant="standard"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              helperText="Enter the user's UID to add them to the club"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddMemberDialog(false)}>Cancel</Button>
            <Button onClick={handleAddMember} variant="contained">Add</Button>
          </DialogActions>
        </Dialog>

        {/* Rotate Invite Code Dialog */}
        <Dialog open={rotateDialog} onClose={() => setRotateDialog(false)}>
          <DialogTitle>Rotate Invite Code</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to rotate the invite code? The current code will no longer work,
              and you'll need to share the new code with members who want to join.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRotateDialog(false)}>Cancel</Button>
            <Button onClick={handleRotateInviteCode} color="primary" variant="contained">
              Rotate
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Club Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle>Delete Club</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this club? This action cannot be undone.
              All books, goals, meetings, and posts in this club will be deleted.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDeleteClub} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default ClubManagement;

