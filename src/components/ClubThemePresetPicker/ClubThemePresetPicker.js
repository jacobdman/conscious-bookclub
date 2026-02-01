import React from 'react';
// UI
import {
  Box,
  ButtonBase,
  FormControlLabel,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
// Utils
import { CLUB_THEME_PRESETS } from 'utils/clubThemePresets';

const ClubThemePresetPicker = ({
  selectedPresetId,
  mode = 'light',
  onPresetChange,
  onModeChange,
  disabled = false,
  title,
  subtitle,
  showModeToggle = true,
  modeLabel = 'Dark mode',
  modeHelper,
}) => (
  <Box>
    {(title || subtitle) && (
      <Box sx={{ mb: 1.5 }}>
        {title && (
          <Typography variant="h6" sx={{ mb: subtitle ? 0.5 : 0 }}>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    )}

    {showModeToggle && (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
          mb: 1.5,
        }}
      >
        {modeHelper && (
          <Typography variant="body2" color="text.secondary">
            {modeHelper}
          </Typography>
        )}
        <FormControlLabel
          control={
            <Switch
              checked={mode === 'dark'}
              onChange={(event) => onModeChange(event.target.checked ? 'dark' : 'light')}
              disabled={disabled}
            />
          }
          label={modeLabel}
        />
      </Box>
    )}

    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
        gap: 2,
      }}
    >
      {CLUB_THEME_PRESETS.map((preset) => {
        const isSelected = selectedPresetId === preset.id;
        const preview = preset.preview?.[mode] || preset.preview?.light || preset.preview;
        return (
          <ButtonBase
            key={preset.id}
            onClick={() => onPresetChange(preset.id)}
            disabled={disabled}
            sx={{ textAlign: 'left' }}
          >
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                width: '100%',
                borderColor: isSelected ? 'primary.main' : 'divider',
                boxShadow: isSelected ? 3 : 0,
                transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
              }}
            >
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
);

export default ClubThemePresetPicker;
