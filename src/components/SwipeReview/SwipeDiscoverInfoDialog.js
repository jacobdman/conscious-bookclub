import React, { useMemo } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Typography,
} from '@mui/material';
import useClubContext from 'contexts/Club';
import { confirmDialogPrimaryButtonSx } from 'theme';
import { triggerHaptic } from 'utils/haptics';
import { getPlatform } from 'utils/platformHelpers';

const DEFAULT_REVAL_MIN = 3;
const DEFAULT_REVAL_RATIO = 0.5;

const Section = ({ title, children }) => (
  <Box component="section" sx={{ mt: 2.5, '&:first-of-type': { mt: 0 } }}>
    <Typography
      component="h3"
      variant="subtitle2"
      sx={{ fontWeight: 700, color: 'text.primary', mb: 1, letterSpacing: '0.02em' }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

const Bullet = ({ children }) => (
  <Typography
    component="li"
    variant="body2"
    sx={{
      color: 'text.secondary',
      fontSize: '0.9375rem',
      lineHeight: 1.55,
      display: 'list-item',
      ml: 2,
      pl: 0.5,
    }}
  >
    {children}
  </Typography>
);

/**
 * Glass-shell help dialog (inherits app MuiDialog paper + backdrop).
 */
const SwipeDiscoverInfoDialog = ({ open, onClose }) => {
  const { currentClub } = useClubContext();
  const bd = currentClub?.config?.bookDiscovery;

  const revalMin = bd?.revalidationMinReviews ?? DEFAULT_REVAL_MIN;
  const revalRatio = bd?.revalidationSurvivalRatio ?? DEFAULT_REVAL_RATIO;
  const revalPct = useMemo(() => Math.round(revalRatio * 100), [revalRatio]);

  const handleClose = () => {
    if (getPlatform() === 'ios') triggerHaptic('light');
    onClose?.();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      closeAfterTransition
      aria-labelledby="swipe-discover-help-title"
      slotProps={{
        root: {
          sx: {
            // Discover shell uses zIndex.modal + 2; default Dialog is modal (1300) and renders behind it.
            zIndex: (theme) => theme.zIndex.modal + 10,
          },
        },
      }}
    >
      <DialogContent sx={{ px: 2.5, pt: 2.75, pb: 1 }}>
        <Typography
          id="swipe-discover-help-title"
          component="h2"
          sx={{
            fontWeight: 700,
            fontSize: '1.125rem',
            lineHeight: 1.35,
            letterSpacing: '-0.01em',
            color: 'text.primary',
          }}
        >
          How Discover works
        </Typography>

        <Typography variant="body2" sx={{ mt: 1.25, color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          Use the menu at the top to switch queues: Discover, Hot Picks, Champion Picks, Bookmarked, and Backlog
          Review.
        </Typography>

        <Typography variant="body2" sx={{ mt: 1.5, color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.5 }}>
          If you keep <strong>Discover</strong> selected, after new suggestions are exhausted we automatically
          continue with your <strong>Bookmarked</strong> list, then <strong>Backlog Review</strong> titles, without
          changing the menu — so you can keep swiping in one session.
        </Typography>

        <Section title="Discover — actions">
          <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
            <Bullet>
              <strong>Pass</strong> — remove this title from your personal queue (swipe left or skip). Does not tell
              others you disliked it.
            </Bullet>
            <Bullet>
              <strong>Like</strong> — vote for the club; enough likes can promote a book toward the backlog (swipe
              right or thumbs up).
            </Bullet>
            <Bullet>
              <strong>Super-like</strong> — strongest signal; you have a limited number per cycle (badge). Swipe up.
            </Bullet>
            <Bullet>
              <strong>Bookmark</strong> — save for later (swipe down). While bookmarked, a title stays out of
              Discover, Hot Picks, and Champion Picks; after other suggestions are exhausted, the same Discover session
              continues with your bookmarked list, or open <strong>Bookmarked</strong> anytime.
            </Bullet>
          </Box>
        </Section>

        <Section title="Backlog Review">
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.55 }}>
            Books your club already moved to the backlog that are up for a community check-in. Swipe{' '}
            <strong>right</strong> if you&apos;re still interested, <strong>left</strong> if not, or use{' '}
            <strong>skip</strong> to decide later.
          </Typography>
        </Section>

        <Section title="Re-validation timing & logic">
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.9375rem', lineHeight: 1.55 }}>
            On the <strong>1st of each month</strong> (UTC), titles in the backlog can be flagged for Backlog Review
            so members can re-evaluate interest.
          </Typography>
          <Box component="ul" sx={{ m: 0, mt: 1, p: 0, listStyle: 'none' }}>
            <Bullet>
              After at least <strong>{revalMin}</strong> combined pass/like reviews in that cycle, we look at the share
              of <strong>likes</strong> among those reviews.
            </Bullet>
            <Bullet>
              If that share is <strong>below {revalPct}%</strong>, the book returns to suggestions; if it&apos;s at or
              above, it stays on the backlog and the cycle flag clears. Admins can change these thresholds in club
              settings.
            </Bullet>
          </Box>
        </Section>
      </DialogContent>

      <DialogActions
        sx={{
          px: 2.5,
          pt: 2,
          pb: 'max(24px, calc(12px + env(safe-area-inset-bottom, 0px)))',
          '& > .MuiButton-root': { m: 0 },
        }}
      >
        <Button variant="contained" disableElevation onClick={handleClose} sx={confirmDialogPrimaryButtonSx}>
          Got it
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SwipeDiscoverInfoDialog;
