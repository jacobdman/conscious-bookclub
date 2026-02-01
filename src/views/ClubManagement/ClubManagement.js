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
  Stack,
  Checkbox,
  Autocomplete,
  Chip,
  FormControlLabel,
  Switch,
  Tooltip,
  Tabs,
  Tab,
  Fade,
} from '@mui/material';
import {
  Delete,
  Edit,
  Add,
  Save,
  Cancel,
  ContentCopy,
  Refresh,
  Check,
  ArrowUpward,
  ArrowDownward,
  Restore,
  InfoOutlined,
} from '@mui/icons-material';
import Layout from 'components/Layout';
import ClubThemePresetPicker from 'components/ClubThemePresetPicker';
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
import {
  DASHBOARD_SECTIONS,
  getDefaultDashboardConfig,
  sanitizeDashboardConfig,
} from 'utils/dashboardConfig';
import { CLUB_THEME_PRESETS, getPresetForOverrides } from 'utils/clubThemePresets';

const DEFAULT_THEMES = ['Classy', 'Creative', 'Curious'];

const TabPanel = ({ children, value, tabId }) => (
  <Fade in={value === tabId} timeout={250} mountOnEnter unmountOnExit>
    <Box
      role="tabpanel"
      hidden={value !== tabId}
      id={`club-manage-tabpanel-${tabId}`}
      aria-labelledby={`club-manage-tab-${tabId}`}
      sx={{ pt: 2 }}
    >
      {children}
    </Box>
  </Fade>
);

const ClubManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { currentClub, refreshClubs, refreshClubMembers } = useClubContext();
  const [activeTab, setActiveTab] = useState('club');
  const [editingName, setEditingName] = useState(false);
  const [clubName, setClubName] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addMemberDialog, setAddMemberDialog] = useState(false);
  const [newMemberId, setNewMemberId] = useState('');
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [rotateDialog, setRotateDialog] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [dashboardConfig, setDashboardConfig] = useState(getDefaultDashboardConfig());
  const [savingDashboard, setSavingDashboard] = useState(false);
  const [themesEnabled, setThemesEnabled] = useState(true);
  const [themes, setThemes] = useState(DEFAULT_THEMES);
  const [savingThemes, setSavingThemes] = useState(false);
  const [themesInfoOpen, setThemesInfoOpen] = useState(false);
  const [selectedClubThemeId, setSelectedClubThemeId] = useState(null);
  const [clubThemeMode, setClubThemeMode] = useState('light');
  const [savingClubTheme, setSavingClubTheme] = useState(false);

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
      setDashboardConfig(sanitizeDashboardConfig(currentClub.dashboardConfig));
      setThemesEnabled(currentClub.themesEnabled ?? true);
      if (Array.isArray(currentClub.themes) && currentClub.themes.length > 0) {
        setThemes(currentClub.themes);
      } else {
        setThemes(DEFAULT_THEMES);
      }
      const presetMatch = getPresetForOverrides(currentClub.themeOverrides || {});
      setSelectedClubThemeId(presetMatch?.preset?.id ?? null);
      setClubThemeMode(
        presetMatch?.mode ??
          (currentClub?.themeOverrides?.palette?.mode === 'dark' ? 'dark' : 'light'),
      );
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
    if (currentClub.role !== 'owner') {
      setError('Only owners can change member roles.');
      return;
    }

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

  const handleCopyInviteCode = async () => {
    if (currentClub?.inviteCode) {
      try {
        await navigator.clipboard.writeText(currentClub.inviteCode);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch (err) {
        console.error('Failed to copy invite code:', err);
      }
    }
  };

  const handleCopyInviteUrl = async () => {
    if (currentClub?.inviteCode) {
      const inviteUrl = `${window.location.origin}/login?inviteCode=${encodeURIComponent(currentClub.inviteCode)}`;
      try {
        await navigator.clipboard.writeText(inviteUrl);
        setCopiedUrl(true);
        setTimeout(() => setCopiedUrl(false), 2000);
      } catch (err) {
        console.error('Failed to copy invite URL:', err);
      }
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

  const handleToggleSection = (sectionId) => {
    setDashboardConfig((prev) => {
      const sanitized = sanitizeDashboardConfig(prev);
      return sanitized.map((item) =>
        item.id === sectionId ? {...item, enabled: !item.enabled} : item
      );
    });
  };

  const handleMoveSection = (sectionId, direction) => {
    setDashboardConfig((prev) => {
      const sanitized = sanitizeDashboardConfig(prev);
      const currentIndex = sanitized.findIndex((item) => item.id === sectionId);
      if (currentIndex === -1) return sanitized;

      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= sanitized.length) {
        return sanitized;
      }

      const newConfig = [...sanitized];
      [newConfig[currentIndex], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[currentIndex]];
      return newConfig;
    });
  };

  const handleResetDashboard = () => {
    setDashboardConfig(getDefaultDashboardConfig());
  };

  const handleSaveDashboard = async () => {
    if (!currentClub || !user) return;

    try {
      setSavingDashboard(true);
      setError(null);
      const sanitized = sanitizeDashboardConfig(dashboardConfig);
      await updateClub(currentClub.id, user.uid, {dashboardConfig: sanitized});
      await refreshClubs();
      setDashboardConfig(sanitized);
    } catch (err) {
      setError('Failed to update dashboard settings');
      console.error('Error updating dashboard settings:', err);
    } finally {
      setSavingDashboard(false);
    }
  };

  const normalizeThemes = (themeList) => {
    const cleaned = (themeList || [])
      .map((theme) => (typeof theme === 'string' ? theme.trim() : ''))
      .filter((theme) => theme.length > 0);
    return Array.from(new Set(cleaned));
  };

  const handleSaveThemes = async () => {
    if (!currentClub || !user) return;

    const sanitizedThemes = normalizeThemes(themes);
    if (themesEnabled && sanitizedThemes.length === 0) {
      setError('Add at least one theme or disable themes.');
      return;
    }

    try {
      setSavingThemes(true);
      setError(null);
      await updateClub(currentClub.id, user.uid, {
        themesEnabled,
        themes: sanitizedThemes,
      });
      await refreshClubs();
      setThemes(sanitizedThemes.length > 0 ? sanitizedThemes : DEFAULT_THEMES);
    } catch (err) {
      setError('Failed to update theme settings');
      console.error('Error updating themes:', err);
    } finally {
      setSavingThemes(false);
    }
  };

  const handleSaveClubTheme = async () => {
    if (!currentClub || !user || !selectedClubThemeId) return;

    const selectedPreset = CLUB_THEME_PRESETS.find((preset) => preset.id === selectedClubThemeId);
    if (!selectedPreset) {
      setError('Please select a valid club theme.');
      return;
    }

    const selectedOverrides = selectedPreset.overrides?.[clubThemeMode] ?? selectedPreset.overrides?.light ?? {};

    try {
      setSavingClubTheme(true);
      setError(null);
      await updateClub(currentClub.id, user.uid, {
        themeOverrides: selectedOverrides,
      });
      await refreshClubs();
    } catch (err) {
      setError('Failed to update club theme.');
      console.error('Error updating club theme:', err);
    } finally {
      setSavingClubTheme(false);
    }
  };

  const isOwner = currentClub?.role === 'owner';
  const canManageClub = ['owner', 'admin'].includes(currentClub?.role);
  const currentThemePreset = getPresetForOverrides(currentClub?.themeOverrides || {});

  if (!currentClub) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="info">Please select a club to manage.</Alert>
        </Box>
      </Layout>
    );
  }

  if (!canManageClub) {
    return (
      <Layout>
        <Box sx={{ p: 3 }}>
          <Alert severity="error">You do not have permission to access this page.</Alert>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Typography variant="h4" sx={{ mb: 2, fontSize: { xs: '1.75rem', md: '2.125rem' } }}>Manage Club</Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(event, value) => setActiveTab(value)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Club management tabs"
          >
            <Tab label="Club" value="club" id="club-manage-tab-club" aria-controls="club-manage-tabpanel-club" />
            <Tab label="Members" value="members" id="club-manage-tab-members" aria-controls="club-manage-tabpanel-members" />
            <Tab label="Themes" value="themes" id="club-manage-tab-themes" aria-controls="club-manage-tabpanel-themes" />
            <Tab label="Dashboard" value="dashboard" id="club-manage-tab-dashboard" aria-controls="club-manage-tabpanel-dashboard" />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} tabId="club">
          {/* Club Name Section */}
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontSize: { xs: '1rem', md: '1.25rem' } }}>Club Name</Typography>
            {editingName ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  fullWidth
                  size="small"
                />
                <IconButton color="primary" onClick={handleSaveName} size="small">
                  <Save />
                </IconButton>
                <IconButton onClick={() => {
                  setEditingName(false);
                  setClubName(currentClub.name);
                }} size="small">
                  <Cancel />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Typography variant="body1">{clubName}</Typography>
                <IconButton size="small" onClick={() => setEditingName(true)}>
                  <Edit />
                </IconButton>
              </Box>
            )}
          </Paper>

          {/* Invite Code Section */}
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontSize: { xs: '1rem', md: '1.25rem' } }}>Invite Code</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Share this code or URL with others to allow them to join your club. You can rotate the code at any time for security.
            </Typography>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Invite Code
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                        fontSize: { xs: '0.875rem', md: '1rem' },
                      },
                    }}
                  />
                  <IconButton
                    color={copiedCode ? 'success' : 'primary'}
                    onClick={handleCopyInviteCode}
                    title="Copy invite code"
                    size="small"
                  >
                    {copiedCode ? <Check /> : <ContentCopy />}
                  </IconButton>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                  Invite URL
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    value={currentClub?.inviteCode ? `${window.location.origin}/login?inviteCode=${encodeURIComponent(currentClub.inviteCode)}` : ''}
                    fullWidth
                    size="small"
                    InputProps={{
                      readOnly: true,
                    }}
                    sx={{
                      '& .MuiInputBase-input': {
                        fontSize: { xs: '0.75rem', md: '0.875rem' },
                        wordBreak: 'break-all',
                      },
                    }}
                  />
                  <IconButton
                    color={copiedUrl ? 'success' : 'primary'}
                    onClick={handleCopyInviteUrl}
                    title="Copy invite URL"
                    size="small"
                  >
                    {copiedUrl ? <Check /> : <ContentCopy />}
                  </IconButton>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => setRotateDialog(true)}
                  size="small"
                >
                  Rotate Code
                </Button>
              </Box>
            </Stack>
          </Paper>

          {/* Delete Club Section */}
          {isOwner && (
            <Paper sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ mb: 1.5, color: 'error.main', fontSize: { xs: '1rem', md: '1.25rem' } }}>Danger Zone</Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={() => setDeleteDialog(true)}
                size="small"
              >
                Delete Club
              </Button>
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={activeTab} tabId="members">
          {/* Members Section */}
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>Members</Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setAddMemberDialog(true)}
                size="small"
              >
                Add Member
              </Button>
            </Box>

            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <List sx={{ py: 0 }}>
                {members.map((member) => (
                  <ListItem key={member.userId} sx={{ px: { xs: 0, md: 2 }, py: 1 }}>
                    <ListItemText
                      primary={member.user.displayName || member.user.email}
                      secondary={member.user.email}
                      primaryTypographyProps={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
                      secondaryTypographyProps={{ fontSize: { xs: '0.75rem', md: '0.875rem' } }}
                    />
                    <ListItemSecondaryAction>
                      <FormControl size="small" sx={{ minWidth: { xs: 100, md: 120 }, mr: 1 }}>
                        <Select
                          value={member.role}
                          onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                          disabled={!isOwner}
                        >
                          <MenuItem value="member">Member</MenuItem>
                          <MenuItem value="calendar-admin">Calendar Admin</MenuItem>
                          <MenuItem value="admin">Admin</MenuItem>
                          <MenuItem value="owner">Owner</MenuItem>
                        </Select>
                      </FormControl>
                      {member.userId !== user.uid && (
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleRemoveMember(member.userId)}
                          size="small"
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
        </TabPanel>

        <TabPanel value={activeTab} tabId="themes">
          {/* Club Theme Section */}
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
              Club Theme
            </Typography>
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
              <Typography variant="body2" color="text.secondary">
                Current theme: {currentThemePreset?.preset?.name || 'Custom'} · {clubThemeMode === 'dark' ? 'Dark' : 'Light'}
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={clubThemeMode === 'dark'}
                    onChange={(event) => setClubThemeMode(event.target.checked ? 'dark' : 'light')}
                    disabled={!isOwner}
                  />
                }
                label="Dark mode"
              />
            </Box>
            {!isOwner && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Only club owners can update the club theme.
              </Typography>
            )}
            <ClubThemePresetPicker
              selectedPresetId={selectedClubThemeId}
              mode={clubThemeMode}
              onPresetChange={(presetId) => {
                if (isOwner) setSelectedClubThemeId(presetId);
              }}
              onModeChange={(nextMode) => setClubThemeMode(nextMode)}
              disabled={!isOwner}
              showModeToggle={false}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveClubTheme}
                disabled={!isOwner || savingClubTheme || !selectedClubThemeId}
                size="small"
              >
                {savingClubTheme ? 'Saving...' : 'Save Club Theme'}
              </Button>
            </Box>
          </Paper>

          {/* Themes Section */}
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Typography variant="h6" sx={{ fontSize: { xs: '1rem', md: '1.25rem' } }}>
                Book Themes
              </Typography>
              <Tooltip
                title="We recommend Classy, Creative, and Curious (self-development, fiction, psychology), but you can add as few or as many themes as you want."
                placement="top"
              >
                <IconButton
                  size="small"
                  aria-label="themes info"
                  onClick={() => setThemesInfoOpen(true)}
                >
                  <InfoOutlined fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Enable themes to categorize books and filter the list by theme.
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={themesEnabled}
                  onChange={(event) => setThemesEnabled(event.target.checked)}
                  disabled={savingThemes}
                />
              }
              label="Enable themes"
            />
            {themesEnabled && (
              <Autocomplete
                multiple
                freeSolo
                clearOnEscape
                options={[]}
                value={themes}
                onChange={(event, value) => setThemes(value)}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      variant="outlined"
                      label={option}
                      {...getTagProps({ index })}
                      key={option}
                    />
                  ))
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Themes"
                    placeholder="Add a theme"
                    size="small"
                    sx={{ mt: 2 }}
                  />
                )}
              />
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveThemes}
                disabled={savingThemes}
                size="small"
              >
                {savingThemes ? 'Saving...' : 'Save Themes'}
              </Button>
            </Box>
          </Paper>
        </TabPanel>

        <Dialog open={themesInfoOpen} onClose={() => setThemesInfoOpen(false)}>
          <DialogTitle sx={{ pb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>
            Theme Recommendations
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2">
              We recommend Classy, Creative, and Curious (self-development, fiction, psychology), but you can add as few or as many themes as you want.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2 }}>
            <Button onClick={() => setThemesInfoOpen(false)} size="small">
              Close
            </Button>
          </DialogActions>
        </Dialog>

        <TabPanel value={activeTab} tabId="dashboard">
          {/* Dashboard Section */}
          <Paper sx={{ p: { xs: 2, md: 3 }, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontSize: { xs: '1rem', md: '1.25rem' } }}>Dashboard</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Re-order or disable dashboard sections. Disabled sections remain in the list but will not show on the dashboard.
            </Typography>
            <List sx={{ py: 0 }}>
              {dashboardConfig.map((section, index) => {
                const sectionMeta = DASHBOARD_SECTIONS.find(({ id }) => id === section.id);
                if (!sectionMeta) return null;
                const enabled = section.enabled !== false;

                return (
                  <ListItem
                    key={section.id}
                    sx={{
                      px: { xs: 0, md: 2 },
                      py: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                    }}
                  >
                    <Checkbox
                      edge="start"
                      checked={enabled}
                      onChange={() => handleToggleSection(section.id)}
                      inputProps={{ 'aria-label': `Toggle ${sectionMeta.label}` }}
                    />
                    <ListItemText
                      primary={sectionMeta.label}
                      primaryTypographyProps={{ fontSize: { xs: '0.95rem', md: '1rem' } }}
                      secondary={sectionMeta.description}
                    />
                    <ListItemSecondaryAction sx={{ right: { xs: 0, md: 8 } }}>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveSection(section.id, -1)}
                        disabled={index === 0}
                        aria-label={`Move ${sectionMeta.label} up`}
                      >
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleMoveSection(section.id, 1)}
                        disabled={index === dashboardConfig.length - 1}
                        aria-label={`Move ${sectionMeta.label} down`}
                      >
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                );
              })}
            </List>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mt: 1 }}>
              <Button
                variant="text"
                startIcon={<Restore />}
                onClick={handleResetDashboard}
                size="small"
              >
                Reset to Default
              </Button>
              <Button
                variant="contained"
                startIcon={<Save />}
                onClick={handleSaveDashboard}
                disabled={savingDashboard}
                size="small"
              >
                {savingDashboard ? 'Saving...' : 'Save Dashboard'}
              </Button>
            </Box>
          </Paper>
        </TabPanel>

        {/* Add Member Dialog */}
        <Dialog open={addMemberDialog} onClose={() => setAddMemberDialog(false)}>
          <DialogTitle sx={{ pb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>Add Member</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <TextField
              autoFocus
              margin="dense"
              label="User ID"
              fullWidth
              variant="standard"
              size="small"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              helperText="Enter the user's UID to add them to the club"
            />
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2 }}>
            <Button onClick={() => setAddMemberDialog(false)} size="small">Cancel</Button>
            <Button onClick={handleAddMember} variant="contained" size="small">Add</Button>
          </DialogActions>
        </Dialog>

        {/* Rotate Invite Code Dialog */}
        <Dialog open={rotateDialog} onClose={() => setRotateDialog(false)}>
          <DialogTitle sx={{ pb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>Rotate Invite Code</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2">
              Are you sure you want to rotate the invite code? The current code will no longer work,
              and you'll need to share the new code with members who want to join.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2 }}>
            <Button onClick={() => setRotateDialog(false)} size="small">Cancel</Button>
            <Button onClick={handleRotateInviteCode} color="primary" variant="contained" size="small">
              Rotate
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Club Dialog */}
        <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
          <DialogTitle sx={{ pb: 1, fontSize: { xs: '1rem', md: '1.25rem' } }}>Delete Club</DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            <Typography variant="body2">
              Are you sure you want to delete this club? This action cannot be undone.
              All books, goals, meetings, and posts in this club will be deleted.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 2, pb: 2 }}>
            <Button onClick={() => setDeleteDialog(false)} size="small">Cancel</Button>
            <Button onClick={handleDeleteClub} color="error" variant="contained" size="small">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
};

export default ClubManagement;

