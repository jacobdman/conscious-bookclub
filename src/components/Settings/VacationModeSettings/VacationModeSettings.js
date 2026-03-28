import React, { useState } from 'react';
// UI
import {
  Alert,
  Box,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Components
import IOSConfirmDialog from 'components/IOSConfirmDialog';
// Services
import { setVacationMode } from 'services/users/users.service';
// Utils
import { SUCCESS_MESSAGE_DURATION } from 'components/Settings/ThemeSettings/utils';

const VacationModeSettings = () => {
  const { user, userProfile, setUserProfile } = useAuth();
  const { currentClub, refreshClubMembers } = useClubContext();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [enableDialogOpen, setEnableDialogOpen] = useState(false);
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const vacationMode = Boolean(userProfile?.settings?.vacationMode);

  const applyVacationResponse = async (updatedUser) => {
    if (updatedUser) {
      setUserProfile(updatedUser);
    }
    await queryClient.invalidateQueries({ queryKey: ['goals', user.uid] });
    queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    if (currentClub?.id) {
      refreshClubMembers(currentClub.id, true);
    }
  };

  const handleConfirmEnable = async () => {
    if (!user) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const updated = await setVacationMode(user.uid, true);
      await applyVacationResponse(updated);
      setEnableDialogOpen(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), SUCCESS_MESSAGE_DURATION);
    } catch (err) {
      console.error('Error enabling vacation mode:', err);
      setError(err.message || 'Failed to enable vacation mode');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDisable = async () => {
    if (!user) return;
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      const updated = await setVacationMode(user.uid, false);
      await applyVacationResponse(updated);
      setDisableDialogOpen(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), SUCCESS_MESSAGE_DURATION);
    } catch (err) {
      console.error('Error disabling vacation mode:', err);
      setError(err.message || 'Failed to disable vacation mode');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchChange = (_event, nextChecked) => {
    if (saving) return;
    setError(null);
    if (nextChecked) {
      setEnableDialogOpen(true);
    } else {
      setDisableDialogOpen(true);
    }
  };

  if (!user) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Sign in to manage vacation mode.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6">Vacation mode</Typography>
        <Typography variant="body2" color="text.secondary">
          Pause all habit and metric goals across every club you belong to. Leaderboard periods won&apos;t
          count against you while goals are paused, and you won&apos;t be able to add or edit entries until
          you resume.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Vacation mode updated.
        </Alert>
      )}

      <FormControlLabel
        control={
          <Switch
            checked={vacationMode}
            onChange={handleSwitchChange}
            disabled={saving}
            color="primary"
          />
        }
        label={vacationMode ? 'Vacation mode on' : 'Vacation mode off'}
      />

      {vacationMode && (
        <Typography variant="body2" color="text.secondary">
          New habit and metric goals you create will be paused automatically until you turn vacation mode off.
        </Typography>
      )}

      <IOSConfirmDialog
        open={enableDialogOpen}
        onClose={() => !saving && setEnableDialogOpen(false)}
        title="Turn on vacation mode?"
        description="This will pause every habit and metric goal in all your clubs that isn’t already paused. You can turn it off anytime."
        confirmLabel="Turn on"
        cancelLabel="Cancel"
        confirmDisabled={saving}
        onConfirm={handleConfirmEnable}
      />

      <IOSConfirmDialog
        open={disableDialogOpen}
        onClose={() => !saving && setDisableDialogOpen(false)}
        title="Turn off vacation mode?"
        description="This will resume every paused habit and metric goal—including goals you paused manually before vacation. You’ll be able to log entries again on all of them."
        confirmLabel="Turn off"
        cancelLabel="Cancel"
        confirmDisabled={saving}
        destructive
        onConfirm={handleConfirmDisable}
      />
    </Box>
  );
};

export default VacationModeSettings;
