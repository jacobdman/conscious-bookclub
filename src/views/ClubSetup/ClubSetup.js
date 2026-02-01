import React, { useMemo, useState } from 'react';
// UI
import { Box } from '@mui/material';
// Components
import ClubSetupWizard from 'components/ClubSetupWizard';
import SetupLayout from 'components/SetupLayout';
// Utils
import { CLUB_THEME_PRESETS } from 'utils/clubThemePresets';

const ClubSetup = () => {
  const [selectedPresetId, setSelectedPresetId] = useState(CLUB_THEME_PRESETS[0]?.id || '');
  const [presetMode, setPresetMode] = useState('light');

  const themeOverrides = useMemo(() => {
    const preset = CLUB_THEME_PRESETS.find((entry) => entry.id === selectedPresetId);
    if (!preset) return {};
    return preset.overrides?.[presetMode] ?? preset.overrides?.light ?? {};
  }, [presetMode, selectedPresetId]);

  return (
    <SetupLayout themeOverrides={themeOverrides}>
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          px: 2,
          py: { xs: 3, md: 6 },
        }}
      >
        <ClubSetupWizard
          selectedPresetId={selectedPresetId}
          presetMode={presetMode}
          onPresetChange={setSelectedPresetId}
          onModeChange={setPresetMode}
        />
      </Box>
    </SetupLayout>
  );
};

export default ClubSetup;
