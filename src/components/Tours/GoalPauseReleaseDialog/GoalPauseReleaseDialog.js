import React, { useState } from 'react';
import { Box, Button, Modal, Paper, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useTutorial from 'contexts/Tutorial';
import { getClubFeatures } from 'utils/clubFeatures';
import {
  liquidGlassBackdropSx,
  liquidGlassModalContainerSx,
  liquidGlassPaperSx,
  liquidGlassPrimaryButtonSx,
  liquidGlassSecondaryButtonSx,
} from 'utils/liquidGlassDialogStyles';

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
    <Modal
      open={open}
      onClose={handleIgnore}
      closeAfterTransition
      aria-labelledby="goal-pause-release-title"
      aria-describedby="goal-pause-release-desc"
      slotProps={{
        backdrop: {
          sx: liquidGlassBackdropSx,
        },
      }}
      sx={liquidGlassModalContainerSx}
    >
      <Paper elevation={0} sx={liquidGlassPaperSx}>
        <Box sx={{ px: 2.5, pt: 2.75, pb: 0.5 }}>
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
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column-reverse', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            justifyContent: 'flex-end',
            gap: 1,
            px: 2.5,
            pb: 2.5,
            pt: 1.25,
          }}
        >
          <Button variant="outlined" onClick={handleIgnore} sx={liquidGlassSecondaryButtonSx(theme)}>
            Ignore
          </Button>
          <Button variant="contained" disableElevation onClick={handleShowMeHow} sx={liquidGlassPrimaryButtonSx}>
            Show me how
          </Button>
        </Box>
      </Paper>
    </Modal>
  );
};

export default GoalPauseReleaseDialog;
