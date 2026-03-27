import React, { useState } from 'react';
// UI
import { Button, Dialog, DialogActions, DialogContent, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useTutorial from 'contexts/Tutorial';
// Utils
import { confirmDialogPrimaryButtonSx, confirmDialogSecondaryButtonSx } from 'theme';
import { getClubFeatures } from 'utils/clubFeatures';

const TUTORIAL_RELEASE = 'goalPauseRelease';

const GoalPauseReleaseDialog = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const { shouldShowTutorial, completeTutorial, startTutorial } = useTutorial();
  const [open, setOpen] = useState(true);

  const features = getClubFeatures(currentClub);
  const goalsEnabled = features.goals !== false;

  const showAnnouncement = Boolean(
    user
    && goalsEnabled
    && shouldShowTutorial(TUTORIAL_RELEASE)
    && !shouldShowTutorial('dashboard'),
  );

  if (!showAnnouncement) {
    return null;
  }

  const handleIgnore = async () => {
    setOpen(false);
    await completeTutorial(TUTORIAL_RELEASE);
  };

  const handleShowMeHow = () => {
    setOpen(false);
    startTutorial(TUTORIAL_RELEASE);
  };

  return (
    <Dialog
      open={open}
      onClose={handleIgnore}
      maxWidth="xs"
      fullWidth
      closeAfterTransition
      aria-labelledby="goal-pause-release-title"
      aria-describedby="goal-pause-release-desc"
    >
      <DialogContent sx={{ px: 2.5, pt: 2.75, pb: 2 }}>
        <Typography
          id="goal-pause-release-title"
          component="h2"
          sx={{
            fontWeight: 700,
            fontSize: '1.125rem',
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
            color: 'text.primary',
          }}
        >
          Just released: Habit Goal Pausing
        </Typography>
        <Typography
          id="goal-pause-release-desc"
          variant="body2"
          sx={{
            mt: 1.25,
            color: 'text.secondary',
            fontSize: '0.9375rem',
            lineHeight: 1.5,
          }}
        >
          Pause habit and metric goals when you need a break. Paused periods won&apos;t count against you on
          consistency leaderboards, and you can resume anytime.
        </Typography>
      </DialogContent>

      <DialogActions
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column-reverse', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: { xs: 'stretch', sm: 'flex-end' },
          gap: 1.5,
          px: 2.5,
          pt: 2,
          pb: 'max(24px, calc(12px + env(safe-area-inset-bottom, 0px)))',
          flexWrap: 'wrap',
          '& > .MuiButton-root': { m: 0 },
        }}
      >
        <Button variant="outlined" onClick={handleIgnore} sx={confirmDialogSecondaryButtonSx(theme)}>
          Ignore
        </Button>
        <Button variant="contained" disableElevation onClick={handleShowMeHow} sx={confirmDialogPrimaryButtonSx}>
          Show me how
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoalPauseReleaseDialog;
