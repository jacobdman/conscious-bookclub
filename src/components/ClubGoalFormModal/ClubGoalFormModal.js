import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Grid,
  IconButton,
  Chip,
  Popover,
  Stack,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import HelpOutline from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useClubGoalsContext } from 'contexts/ClubGoals';

const HELP_CONTRIBUTION_MODE_SECTIONS = [
  {
    title: 'Shared Total',
    body: "One club-wide target. Everyone's logged amounts add up toward that number.",
  },
  {
    title: 'Individual Targets',
    body: 'Each member has the same personal target. Club views roll up how everyone is doing.',
  },
];

const HELP_PROGRESS_DIRECTION_SECTIONS = [
  {
    title: 'Increase toward target',
    body: 'Higher logged totals mean better progress for the period versus the target.',
  },
  {
    title: 'Decrease remaining',
    body: 'The number should fall over time. Club views use budget-style remaining logic.',
  },
  {
    title: 'Stay under (budget)',
    body: "Stay at or below a cap, good for limits like screen time. Views can highlight what's left.",
  },
];

const HELP_REPORTING_PERIOD_SECTIONS = [
  {
    title: 'Same as cadence',
    body: 'Club progress and breakdown use the same window as cadence (e.g. day = today only).',
  },
  {
    title: 'Week, month, or quarter',
    body: 'Club reports sum entries across that full period, even if cadence is daily. Set your target for that whole period (e.g. daily screen-time cap x days in the quarter). Members can log whenever; nothing requires a log every single day.',
  },
];

const HELP_DISPLAY_STYLE_SECTIONS = [
  {
    title: 'Layout is automatic',
    body: 'Dashboard and goal detail views pick the rich card layout from goal type and progress direction. Display style is kept for legacy data only.',
  },
  {
    title: 'Standard progress',
    body: 'Default progress bar and percentage.',
  },
  {
    title: 'Remaining budget',
    body: 'Emphasizes how much is left for budget-style metrics.',
  },
  {
    title: 'Leaderboard-heavy',
    body: 'Emphasizes rankings in club views when available.',
  },
  {
    title: 'Streak-focused',
    body: 'Emphasizes streaks in club views when available.',
  },
];

const FieldRowWithHelp = ({ children, helpSections, helpAriaLabel }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const helpOpen = Boolean(anchorEl);

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{children}</Box>
      <IconButton
        size="small"
        aria-label={helpAriaLabel}
        aria-expanded={helpOpen}
        aria-haspopup="dialog"
        edge="end"
        sx={{ mt: 0.5 }}
        onClick={(e) => {
          e.stopPropagation();
          setAnchorEl((prev) => (prev ? null : e.currentTarget));
        }}
      >
        <HelpOutline fontSize="small" />
      </IconButton>
      <Popover
        open={helpOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={(theme) => ({ zIndex: theme.zIndex.tooltip })}
        PaperProps={{
          sx: { maxWidth: 400, p: 2, pt: 2.25 },
        }}
      >
        <Stack
          component="div"
          spacing={0}
          divider={<Divider flexItem sx={{ my: 1.75, borderColor: 'divider' }} />}
        >
          {helpSections.map((section) => (
            <Box key={section.title}>
              <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 700, mb: 0.75, lineHeight: 1.35 }}>
                {section.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.55 }}>
                {section.body}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Popover>
    </Box>
  );
};

const emptyFormData = () => ({
  title: '',
  type: 'habit',
  measure: 'count',
  cadence: 'week',
  targetCount: '',
  targetQuantity: '',
  unit: '',
  dueAt: null,
  contributionMode: 'shared_total',
  progressDirection: 'increase',
  aggregation: 'sum',
  displayStyle: 'standard',
  reportingPeriod: null,
  milestones: [],
});

const mapClubGoalToFormData = (clubGoal) => {
  if (!clubGoal) return emptyFormData();
  const milestonesRaw = clubGoal.milestoneTemplate ?? clubGoal.milestone_template;
  const milestones = Array.isArray(milestonesRaw)
    ? milestonesRaw.map((m, i) => ({
        title: m.title,
        order: m.order !== undefined ? m.order : i,
      }))
    : [];
  const dueRaw = clubGoal.dueAt ?? clubGoal.due_at;
  return {
    title: clubGoal.title || '',
    type: clubGoal.type || 'habit',
    measure: clubGoal.measure || (clubGoal.type === 'metric' ? 'sum' : 'count'),
    cadence: clubGoal.cadence || 'week',
    targetCount:
      clubGoal.targetCount != null
        ? String(clubGoal.targetCount)
        : clubGoal.target_count != null
          ? String(clubGoal.target_count)
          : '',
    targetQuantity:
      clubGoal.targetQuantity != null
        ? String(clubGoal.targetQuantity)
        : clubGoal.target_quantity != null
          ? String(clubGoal.target_quantity)
          : '',
    unit: clubGoal.unit || '',
    dueAt: dueRaw ? new Date(dueRaw) : null,
    contributionMode: clubGoal.contributionMode ?? clubGoal.contribution_mode ?? 'shared_total',
    progressDirection:
      clubGoal.progressDirection ?? clubGoal.progress_direction ?? 'increase',
    aggregation: clubGoal.aggregation || 'sum',
    displayStyle: clubGoal.displayStyle ?? clubGoal.display_style ?? 'standard',
    reportingPeriod: clubGoal.reportingPeriod ?? clubGoal.reporting_period ?? null,
    milestones,
  };
};

const ClubGoalFormModal = ({ open, onClose, onSaved, clubGoal: editingClubGoal = null }) => {
  const { createClubGoal, updateClubGoal } = useClubGoalsContext();
  const isEditing = Boolean(editingClubGoal?.id);
  const [formData, setFormData] = useState(emptyFormData);
  const [newMilestone, setNewMilestone] = useState({ title: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setFormData(isEditing ? mapClubGoalToFormData(editingClubGoal) : emptyFormData());
    setError(null);
  }, [open, isEditing, editingClubGoal?.id]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddMilestone = () => {
    if (newMilestone.title.trim()) {
      setFormData((prev) => ({
        ...prev,
        milestones: [
          ...prev.milestones,
          { title: newMilestone.title.trim(), order: prev.milestones.length },
        ],
      }));
      setNewMilestone({ title: '' });
    }
  };

  const handleRemoveMilestone = (index) => {
    setFormData((prev) => ({
      ...prev,
      milestones: prev.milestones.filter((_, i) => i !== index),
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    const payload = {
      title: formData.title.trim(),
      type: formData.type,
      contributionMode: formData.contributionMode,
      progressDirection: formData.progressDirection,
      aggregation: formData.aggregation,
      displayStyle: formData.displayStyle,
    };

    if (formData.type === 'habit') {
      payload.measure = 'count';
      payload.cadence = formData.cadence;
      payload.targetCount = parseInt(formData.targetCount, 10);
      if (!payload.targetCount || !payload.cadence) {
        setError('Habit goals require cadence and target count');
        return;
      }
      payload.reportingPeriod =
        formData.reportingPeriod && ['week', 'month', 'quarter'].includes(formData.reportingPeriod) ?
          formData.reportingPeriod :
          null;
    } else if (formData.type === 'metric') {
      payload.measure = 'sum';
      payload.cadence = formData.cadence;
      payload.targetQuantity = parseFloat(formData.targetQuantity);
      payload.unit = (formData.unit || '').trim();
      if (!payload.targetQuantity || !payload.unit || !payload.cadence) {
        setError('Metric goals require cadence, target quantity, and unit');
        return;
      }
      payload.reportingPeriod =
        formData.reportingPeriod && ['week', 'month', 'quarter'].includes(formData.reportingPeriod) ?
          formData.reportingPeriod :
          null;
    } else if (formData.type === 'milestone') {
      if (formData.milestones.length === 0) {
        setError('Add at least one milestone');
        return;
      }
      payload.milestones = formData.milestones.map((m, i) => ({
        title: m.title,
        order: m.order !== undefined ? m.order : i,
      }));
    } else if (formData.type === 'one_time') {
      payload.dueAt = formData.dueAt ? formData.dueAt.toISOString() : null;
    }

    setSaving(true);
    setError(null);
    try {
      if (isEditing) {
        await updateClubGoal(editingClubGoal.id, payload);
      } else {
        await createClubGoal(payload);
      }
      onSaved?.();
      onClose();
    } catch (e) {
      setError(
        e.message ||
          (isEditing ? 'Failed to update club goal' : 'Failed to create club goal'),
      );
    } finally {
      setSaving(false);
    }
  };

  const renderTypeFields = () => {
    switch (formData.type) {
      case 'habit':
        return (
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>Cadence</InputLabel>
                <Select
                  value={formData.cadence}
                  onChange={(e) => handleInputChange('cadence', e.target.value)}
                  label="Cadence"
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                  <MenuItem value="quarter">Quarter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="Target count"
                type="number"
                value={formData.targetCount}
                onChange={(e) => handleInputChange('targetCount', e.target.value)}
                fullWidth
                inputProps={{ min: 1 }}
              />
            </Grid>
          </Grid>
        );
      case 'metric':
        return (
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <FormControl fullWidth>
                <InputLabel>Cadence</InputLabel>
                <Select
                  value={formData.cadence}
                  onChange={(e) => handleInputChange('cadence', e.target.value)}
                  label="Cadence"
                >
                  <MenuItem value="day">Day</MenuItem>
                  <MenuItem value="week">Week</MenuItem>
                  <MenuItem value="month">Month</MenuItem>
                  <MenuItem value="quarter">Quarter</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Target quantity"
                type="number"
                value={formData.targetQuantity}
                onChange={(e) => handleInputChange('targetQuantity', e.target.value)}
                fullWidth
                inputProps={{ step: '0.1', min: 0 }}
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                label="Unit"
                value={formData.unit}
                onChange={(e) => handleInputChange('unit', e.target.value)}
                fullWidth
                placeholder="e.g. hours, pages"
              />
            </Grid>
          </Grid>
        );
      case 'milestone':
        return (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Milestones
            </Typography>
            {formData.milestones.map((milestone, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Chip
                  label={`${index + 1}. ${milestone.title}`}
                  variant="outlined"
                  onDelete={() => handleRemoveMilestone(index)}
                  deleteIcon={<DeleteIcon />}
                />
              </Box>
            ))}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 2 }}>
              <TextField
                label="Milestone title"
                value={newMilestone.title}
                onChange={(e) => setNewMilestone({ title: e.target.value })}
                size="small"
                sx={{ flexGrow: 1 }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') handleAddMilestone();
                }}
              />
              <IconButton onClick={handleAddMilestone} color="primary">
                <AddIcon />
              </IconButton>
            </Box>
          </Box>
        );
      case 'one_time':
        return (
          <DatePicker
            label="Due date (optional)"
            value={formData.dueAt}
            onChange={(date) => handleInputChange('dueAt', date)}
            slotProps={{ textField: { fullWidth: true } }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>{isEditing ? 'Edit club goal' : 'Create club goal'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={formData.type}
                label="Type"
                disabled={isEditing}
                onChange={(e) => {
                  const t = e.target.value;
                  handleInputChange('type', t);
                  if (t === 'habit') handleInputChange('measure', 'count');
                  if (t === 'metric') handleInputChange('measure', 'sum');
                }}
              >
                <MenuItem value="habit">Habit</MenuItem>
                <MenuItem value="metric">Metric</MenuItem>
                <MenuItem value="milestone">Milestone</MenuItem>
                <MenuItem value="one_time">One-time</MenuItem>
              </Select>
            </FormControl>

            <FieldRowWithHelp
              helpSections={HELP_CONTRIBUTION_MODE_SECTIONS}
              helpAriaLabel="Help: contribution mode"
            >
              <FormControl fullWidth>
                <InputLabel>Contribution mode</InputLabel>
                <Select
                  value={formData.contributionMode}
                  label="Contribution mode"
                  onChange={(e) => handleInputChange('contributionMode', e.target.value)}
                >
                  <MenuItem value="shared_total">Shared Total</MenuItem>
                  <MenuItem value="individual_target">Individual Targets</MenuItem>
                </Select>
              </FormControl>
            </FieldRowWithHelp>

            {formData.type === 'metric' && (
              <FieldRowWithHelp
                helpSections={HELP_PROGRESS_DIRECTION_SECTIONS}
                helpAriaLabel="Help: progress direction"
              >
                <FormControl fullWidth>
                  <InputLabel>Progress direction</InputLabel>
                  <Select
                    value={formData.progressDirection}
                    label="Progress direction"
                    onChange={(e) => handleInputChange('progressDirection', e.target.value)}
                  >
                    <MenuItem value="increase">Increase toward target</MenuItem>
                    <MenuItem value="decrease">Decrease remaining</MenuItem>
                    <MenuItem value="stay_under">Stay under (budget)</MenuItem>
                  </Select>
                </FormControl>
              </FieldRowWithHelp>
            )}

            {renderTypeFields()}

            <Accordion
              disableGutters
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle2">Advanced</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Dashboard layout is chosen automatically from goal type and progress direction.
                  Display style is optional and does not change the card layout.
                </Typography>
                <FieldRowWithHelp
                  helpSections={HELP_DISPLAY_STYLE_SECTIONS}
                  helpAriaLabel="Help: display style"
                >
                  <FormControl fullWidth>
                    <InputLabel>Display style (legacy)</InputLabel>
                    <Select
                      value={formData.displayStyle}
                      label="Display style (legacy)"
                      onChange={(e) => handleInputChange('displayStyle', e.target.value)}
                    >
                      <MenuItem value="standard">Standard progress</MenuItem>
                      <MenuItem value="remaining_budget">Remaining budget</MenuItem>
                      <MenuItem value="leaderboard">Leaderboard-heavy</MenuItem>
                      <MenuItem value="streak">Streak-focused</MenuItem>
                    </Select>
                  </FormControl>
                </FieldRowWithHelp>
              </AccordionDetails>
            </Accordion>

            {(formData.type === 'habit' || formData.type === 'metric') && (
              <FieldRowWithHelp
                helpSections={HELP_REPORTING_PERIOD_SECTIONS}
                helpAriaLabel="Help: reporting period for club views"
              >
                <FormControl fullWidth>
                  <InputLabel>Reporting period (club views)</InputLabel>
                  <Select
                    value={formData.reportingPeriod ?? ''}
                    label="Reporting period (club views)"
                    onChange={(e) =>
                      handleInputChange('reportingPeriod', e.target.value || null)
                    }
                  >
                    <MenuItem value="">Same as cadence</MenuItem>
                    <MenuItem value="week">Week</MenuItem>
                    <MenuItem value="month">Month</MenuItem>
                    <MenuItem value="quarter">Quarter</MenuItem>
                  </Select>
                </FormControl>
              </FieldRowWithHelp>
            )}

            {error && (
              <Typography color="error" variant="body2">
                {error}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving || !formData.title.trim()}>
            {saving ? 'Saving…' : isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ClubGoalFormModal;
