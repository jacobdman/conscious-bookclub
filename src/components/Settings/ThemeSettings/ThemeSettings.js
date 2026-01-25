import React, { useEffect, useMemo, useState } from 'react';
// UI
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { CheckCircle } from '@mui/icons-material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Services
import { updateUserProfile } from 'services/users/users.service';
// Utils
import { CLUB_THEME_PRESETS, getPresetForOverrides } from 'utils/clubThemePresets';
import {
  SUCCESS_MESSAGE_DURATION,
  getModeLabel,
  getScopeLabel,
  getSourceLabel,
  getClubMode,
} from './utils';

const ThemeSettings = () => {
  const { user, userProfile, setUserProfile } = useAuth();
  const { currentClub, userClubs } = useClubContext();
  const [selectedClubId, setSelectedClubId] = useState('all');
  const [preference, setPreference] = useState('club');
  const [mode, setMode] = useState('club');
  const [presetId, setPresetId] = useState(CLUB_THEME_PRESETS[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const clubs = useMemo(() => userClubs || [], [userClubs]);
  const selectedClub = useMemo(() => {
    if (!selectedClubId || selectedClubId === 'all') return currentClub;
    return clubs.find((club) => String(club.id) === String(selectedClubId)) || currentClub;
  }, [clubs, currentClub, selectedClubId]);

  const clubThemePreset = useMemo(
    () => getPresetForOverrides(selectedClub?.themeOverrides || {}),
    [selectedClub?.themeOverrides],
  );
  
  const selectedPreset = useMemo(
    () => CLUB_THEME_PRESETS.find((preset) => preset.id === presetId),
    [presetId],
  );

  // Display labels
  const scopeLabel = getScopeLabel(selectedClubId, selectedClub);
  const modeLabel = getModeLabel(mode);
  const sourceLabel = getSourceLabel(preference, selectedPreset);

  // Initialize selected club
  useEffect(() => {
    if (!selectedClubId) {
      setSelectedClubId('all');
    }
  }, [selectedClubId]);

  // Load user's saved preferences for selected club
  useEffect(() => {
    if (!selectedClubId) return;
    const overrides = userProfile?.settings?.clubThemeOverrides || {};
    const override = overrides[String(selectedClubId)];
    if (override) {
      setPreference(override.preference || 'club');
      setMode(override.mode || 'club');
      setPresetId(override.presetId || CLUB_THEME_PRESETS[0]?.id || '');
    } else {
      setPreference('club');
      setMode('club');
      setPresetId(CLUB_THEME_PRESETS[0]?.id || '');
    }
    setError(null);
    setSuccess(false);
  }, [selectedClub, selectedClubId, userProfile]);

  // Ensure presetId is set when preset preference is selected
  useEffect(() => {
    if (preference === 'preset' && !presetId) {
      setPresetId(CLUB_THEME_PRESETS[0]?.id || '');
    }
  }, [preference, presetId]);

  const handleSave = async () => {
    if (!user || !selectedClubId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const existingOverrides = userProfile?.settings?.clubThemeOverrides || {};
      const resolvedPresetId = presetId || CLUB_THEME_PRESETS[0]?.id || null;
      const nextOverrideValue = {
        preference,
        mode,
        ...(preference === 'preset' && resolvedPresetId ? { presetId: resolvedPresetId } : {}),
      };
      const nextOverrides = {
        ...existingOverrides,
        [String(selectedClubId)]: nextOverrideValue,
      };

      // If 'all' is selected, apply to all clubs
      if (String(selectedClubId) === 'all') {
        clubs.forEach((club) => {
          nextOverrides[String(club.id)] = nextOverrideValue;
        });
      }

      const updatedUser = await updateUserProfile(user.uid, {
        settings: {
          clubThemeOverrides: nextOverrides,
        },
      });

      if (updatedUser) {
        setUserProfile(updatedUser);
      }
      setSuccess(true);
      setTimeout(() => setSuccess(false), SUCCESS_MESSAGE_DURATION);
    } catch (saveError) {
      console.error('Error saving theme preferences:', saveError);
      setError(saveError.message || 'Failed to save theme preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Sign in to manage theme preferences.
        </Typography>
      </Box>
    );
  }

  if (!selectedClub && clubs.length === 0) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Join a club to customize your theme preferences.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box>
        <Typography variant="h6">Theme Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Customize your theme per club. Changes only apply to your account.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" onClose={() => setSuccess(false)}>
          Theme preferences saved successfully.
        </Alert>
      )}

      {clubs.length > 1 && (
        <FormControl fullWidth>
          <InputLabel id="club-theme-club-label">Club</InputLabel>
          <Select
            labelId="club-theme-club-label"
            value={selectedClubId}
            label="Club"
            onChange={(event) => setSelectedClubId(event.target.value)}
            disabled={saving}
          >
            <MenuItem value="all">All clubs</MenuItem>
            {clubs.map((club) => (
              <MenuItem key={club.id} value={club.id}>
                {club.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {clubs.length <= 1 && selectedClubId !== 'all' && selectedClub && (
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {selectedClub.name}
        </Typography>
      )}

      {selectedClubId !== 'all' && selectedClub && (
        <Typography variant="body2" color="text.secondary">
          Club theme: {clubThemePreset?.preset?.name || 'Custom'} ·{' '}
          {getClubMode(selectedClub) === 'dark' ? 'Dark' : 'Light'}
        </Typography>
      )}

      <Divider />

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Mode
        </Typography>
        <RadioGroup
          value={mode}
          onChange={(event) => setMode(event.target.value)}
        >
          <FormControlLabel
            value="club"
            control={<Radio />}
            label="Follow club setting"
            disabled={saving}
          />
          <FormControlLabel
            value="light"
            control={<Radio />}
            label="Force light mode"
            disabled={saving}
          />
          <FormControlLabel
            value="dark"
            control={<Radio />}
            label="Force dark mode"
            disabled={saving}
          />
        </RadioGroup>
      </Box>

      <Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Theme source
        </Typography>
        <RadioGroup
          value={preference}
          onChange={(event) => setPreference(event.target.value)}
        >
          <FormControlLabel
            value="club"
            control={<Radio />}
            label="Use club theme"
            disabled={saving}
          />
          <Box>
            <FormControlLabel
              value="preset"
              control={<Radio />}
              label="Use my preset"
              disabled={saving}
            />
            {preference === 'preset' && (
              <Box sx={{ pl: 4, mt: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Choose a preset
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                    gap: 2,
                  }}
                >
                  {CLUB_THEME_PRESETS.map((preset) => {
                    const isSelected = presetId === preset.id;
                    const previewMode = mode === 'club' ? getClubMode(selectedClub) : mode;
                    const preview = preset.preview?.[previewMode] || preset.preview?.light || preset.preview;
                    return (
                      <ButtonBase
                        key={preset.id}
                        onClick={() => setPresetId(preset.id)}
                        disabled={saving}
                        sx={{ textAlign: 'left' }}
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 2,
                            width: '100%',
                            borderColor: isSelected ? 'primary.main' : 'divider',
                            borderWidth: isSelected ? 2 : 1,
                            boxShadow: isSelected ? 4 : 0,
                            backgroundColor: (theme) =>
                              isSelected ? alpha(theme.palette.primary.main, 0.08) : 'transparent',
                            transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
                            position: 'relative',
                          }}
                        >
                          {isSelected && (
                            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                              <CheckCircle color="primary" fontSize="small" />
                            </Box>
                          )}
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {preset.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                            {preset.description}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                            {['primary', 'secondary', 'background', 'accent'].map((key) => (
                              <Box
                                key={key}
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  bgcolor: preview?.[key],
                                  border: '1px solid',
                                  borderColor: 'divider',
                                }}
                              />
                            ))}
                          </Box>
                        </Paper>
                      </ButtonBase>
                    );
                  })}
                </Box>
              </Box>
            )}
          </Box>
        </RadioGroup>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Currently applied for {scopeLabel}: {sourceLabel} · {modeLabel}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'Save Theme Preferences'}
        </Button>
      </Box>
    </Box>
  );
};

export default ThemeSettings;
