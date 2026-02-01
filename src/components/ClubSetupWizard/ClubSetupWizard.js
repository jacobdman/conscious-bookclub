import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// UI
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Components
import ClubThemePresetPicker from 'components/ClubThemePresetPicker';
// Services
import { createClub, updateClub } from 'services/clubs/clubs.service';
// Utils
import { CLUB_THEME_PRESETS } from 'utils/clubThemePresets';
import { getDashboardConfigForFeatures } from 'utils/dashboardConfig';

const DEFAULT_THEMES = ['Classy', 'Creative', 'Curious'];

const ClubSetupWizard = ({
  selectedPresetId = '',
  presetMode = 'light',
  onPresetChange = () => {},
  onModeChange = () => {},
}) => {
  const { user } = useAuth();
  const { refreshClubs, setCurrentClub } = useClubContext();
  const navigate = useNavigate();

  const [clubName, setClubName] = useState('');
  const [features, setFeatures] = useState({
    themes: true,
    books: true,
    goals: true,
    quotes: true,
  });
  const [themes, setThemes] = useState(DEFAULT_THEMES);
  const [themeInputValue, setThemeInputValue] = useState('');
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const steps = useMemo(() => {
    const allSteps = [
      { id: 'basics', label: 'Club basics' },
      { id: 'features', label: 'Club features' },
      { id: 'themes', label: 'Themes', enabled: features.themes },
    ];
    return allSteps.filter((step) => step.enabled !== false);
  }, [features.themes]);

  useEffect(() => {
    if (activeStep >= steps.length) {
      setActiveStep(steps.length - 1);
    }
  }, [activeStep, steps.length]);

  const themesEnabled = features.themes;

  const handleFeatureToggle = (key) => (event) => {
    const { checked } = event.target;
    setFeatures((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleCommitThemeInput = () => {
    const trimmed = themeInputValue.trim();
    if (!trimmed) return;
    if (!themes.includes(trimmed)) {
      setThemes((prev) => [...prev, trimmed]);
    }
    setThemeInputValue('');
  };

  const currentStep = steps[activeStep]?.id;

  const isStepValid = () => {
    if (currentStep === 'basics') {
      return clubName.trim().length > 0 && !!selectedPresetId;
    }
    if (currentStep === 'themes') {
      return !themesEnabled || themes.length > 0;
    }
    return true;
  };

  const getThemeOverrides = () => {
    const preset = CLUB_THEME_PRESETS.find((entry) => entry.id === selectedPresetId);
    if (!preset) return {};
    return preset.overrides?.[presetMode] ?? preset.overrides?.light ?? {};
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('You must be logged in to create a club.');
      return;
    }

    if (!isStepValid()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const created = await createClub(user.uid, clubName.trim());
      const clubId = created?.clubId;
      if (!clubId) {
        throw new Error('Unable to create club.');
      }

      const nextFeatures = {
        themes: features.themes,
        books: features.books,
        goals: features.goals,
        quotes: features.quotes,
      };

      const updatePayload = {
        config: {
          features: nextFeatures,
        },
        dashboardConfig: getDashboardConfigForFeatures(nextFeatures),
        themeOverrides: getThemeOverrides(),
        themesEnabled: themesEnabled,
        ...(themesEnabled ? { themes } : {}),
      };

      await updateClub(clubId, user.uid, updatePayload);
      await refreshClubs();
      await setCurrentClub(clubId);
      navigate('/');
    } catch (saveError) {
      console.error('Error creating club:', saveError);
      setError(saveError.message || 'Failed to create club. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (!isStepValid()) return;
    if (activeStep === steps.length - 1) {
      handleSubmit();
      return;
    }
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <Paper sx={{ p: { xs: 2, md: 4 }, width: '100%', maxWidth: 720, mx: 'auto' }}>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ mb: 1, fontSize: { xs: '1.75rem', md: '2.25rem' } }}>
          Set up your club
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Answer a few quick questions so we can tailor your dashboard and navigation.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((step) => (
          <Step key={step.id}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {currentStep === 'basics' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Club name"
            value={clubName}
            onChange={(event) => setClubName(event.target.value)}
            placeholder="e.g., Conscious Bookclub"
            fullWidth
            required
          />
          <ClubThemePresetPicker
            selectedPresetId={selectedPresetId}
            mode={presetMode}
            onPresetChange={onPresetChange}
            onModeChange={onModeChange}
            title="Visual theme"
            subtitle="This sets the look and feel for everyone in the club."
            modeHelper="Pick a light or dark baseline for your club."
          />
        </Box>
      )}

      {currentStep === 'features' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            What does your club do?
          </Typography>
          <FormGroup>
            <FormControlLabel
              control={<Checkbox checked={features.themes} onChange={handleFeatureToggle('themes')} />}
              label="Discussion themes (recommended)"
            />
            <FormControlLabel
              control={<Checkbox checked={features.books} onChange={handleFeatureToggle('books')} />}
              label="Books"
            />
            <FormControlLabel
              control={<Checkbox checked={features.goals} onChange={handleFeatureToggle('goals')} />}
              label="Goals"
            />
            <FormControlLabel
              control={<Checkbox checked={features.quotes} onChange={handleFeatureToggle('quotes')} />}
              label="Quotes"
            />
          </FormGroup>
        </Box>
      )}

      {currentStep === 'themes' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Customize your club themes
          </Typography>
          <Typography variant="subtitle2" color="text.secondary">
            This can be changed later in the club management page.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add, rename, or remove themes. Members will use these across meetings and discussions.
          </Typography>
          <Autocomplete
            multiple
            freeSolo
            clearOnEscape
            options={[]}
            value={themes}
            inputValue={themeInputValue}
            onInputChange={(event, value) => setThemeInputValue(value)}
            onBlur={handleCommitThemeInput}
            onChange={(event, value) => {
              setThemes(value);
              setThemeInputValue('');
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Themes"
                placeholder="Add a theme"
              />
            )}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
        <Button variant="text" onClick={handleBack} disabled={activeStep === 0 || saving}>
          Back
        </Button>
        <Button variant="contained" onClick={handleNext} disabled={!isStepValid() || saving}>
          {activeStep === steps.length - 1 ? (saving ? 'Creating...' : 'Finish setup') : 'Next'}
        </Button>
      </Box>
    </Paper>
  );
};

export default ClubSetupWizard;
