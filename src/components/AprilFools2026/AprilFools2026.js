import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box } from '@mui/material';
import { isAprilFoolsDay } from 'utils/aprilFools2026';

const OVERLAY_PROBABILITY = 0.08;
const CRACK_IMG = `${process.env.PUBLIC_URL}/april-fools/broken-screen.png`;
/** Hide duration if user stays on the tab (tab switch / pull-refresh clears early). */
const BANNER_SNOOZE_MS = 3 * 60 * 1000;
const BANNER_SNOOZE_KEY = 'aprilFools2026-banner-snooze-until';

/** Random one per full page load; message repeats until hard reload. */
const URGENT_BANNER_MESSAGES = [
  '🚨 URGENT: Someone just finished the book',
  '🚨 URGENT: Never mind they didn’t',
  '🚨 URGENT: It was a metaphor',
  '🚨 URGENT: The book club is now a pyramid scheme (this is not financial advice)',
  '🚨 URGENT: Page 47 was removed for your safety',
  '🚨 URGENT: Spoiler policy updated to yes',
  '🚨 URGENT: The appendix has unionized',
  '🚨 URGENT: Your bookmark has filed for divorce',
  '🚨 URGENT: All copies are now audiobooks (mandatory)',
  '🚨 URGENT: Discussion questions have been replaced with riddles',
  '🚨 URGENT: Reading pace has been nationalized',
  '🚨 URGENT: Plot twist: there was no book club (there was)',
  '🚨 URGENT: Please update your opinion before the next chapter',
  '🚨 URGENT: The epilogue is now legally binding',
  '🚨 URGENT: Someone highlighted the entire book (including the copyright page)',
  '🚨 URGENT: Book club budget reallocated to snacks (unanimous)',
  '🚨 URGENT: The index is out of order on purpose (do not fix)',
  '🚨 URGENT: The foreword has challenged you to a duel',
  '🚨 URGENT: All marginalia has been entered into evidence',
  '🚨 URGENT: The next meeting is in the footnotes (bring a ladder)',
  '🚨 URGENT: Character development has been outsourced',
  '🚨 URGENT: The book has been rated E for Everyone (including pigeons)',
];

/**
 * April 1 only: random cracked-screen overlay + persistent random urgent banner.
 * Remove this component and utils/aprilFools2026.js after the holiday.
 */
const AprilFools2026 = () => {
  const [showCrack, setShowCrack] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try {
      const until = Number(sessionStorage.getItem(BANNER_SNOOZE_KEY));
      if (Number.isFinite(until) && Date.now() < until) return true;
    } catch {
      /* ignore */
    }
    return false;
  });
  const [bannerMessage] = useState(
    () => URGENT_BANNER_MESSAGES[Math.floor(Math.random() * URGENT_BANNER_MESSAGES.length)],
  );

  const showBannerAgain = useCallback(() => {
    try {
      sessionStorage.removeItem(BANNER_SNOOZE_KEY);
    } catch {
      /* ignore */
    }
    setBannerDismissed(false);
  }, []);

  useEffect(() => {
    if (!isAprilFoolsDay()) return;
    if (Math.random() < OVERLAY_PROBABILITY) {
      setShowCrack(true);
    }
  }, []);

  useEffect(() => {
    if (!isAprilFoolsDay()) return;

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      showBannerAgain();
    };

    const onPullRefresh = () => {
      showBannerAgain();
    };

    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('cbc-pull-to-refresh', onPullRefresh);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('cbc-pull-to-refresh', onPullRefresh);
    };
  }, [showBannerAgain]);

  useEffect(() => {
    if (!isAprilFoolsDay() || !bannerDismissed) return;

    const tick = () => {
      try {
        const until = Number(sessionStorage.getItem(BANNER_SNOOZE_KEY));
        if (!Number.isFinite(until) || Date.now() >= until) {
          sessionStorage.removeItem(BANNER_SNOOZE_KEY);
          setBannerDismissed(false);
        }
      } catch {
        setBannerDismissed(false);
      }
    };

    const id = setInterval(tick, 15000);
    tick();
    return () => clearInterval(id);
  }, [bannerDismissed]);

  if (!isAprilFoolsDay()) {
    return null;
  }

  return (
    <>
      {!bannerDismissed && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1200,
            pt: 'env(safe-area-inset-top)',
          }}
        >
          <Alert
            severity="warning"
            variant="filled"
            onClose={() => {
              try {
                sessionStorage.setItem(BANNER_SNOOZE_KEY, String(Date.now() + BANNER_SNOOZE_MS));
              } catch {
                /* ignore */
              }
              setBannerDismissed(true);
            }}
            sx={{
              borderRadius: 0,
              justifyContent: 'center',
              alignItems: 'center',
              fontWeight: 700,
              textAlign: 'center',
              py: 1.5,
              px: 2,
              fontSize: '1.0625rem',
              lineHeight: 1.4,
              '& .MuiAlert-icon': {
                fontSize: '1.75rem',
                alignSelf: 'center',
              },
              '& .MuiAlert-message': {
                width: '100%',
                py: 0.5,
              },
              '& .MuiAlert-action': {
                alignItems: 'center',
                pt: 0,
              },
            }}
          >
            {bannerMessage}
          </Alert>
        </Box>
      )}
      {showCrack && (
        <Box
          aria-hidden
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1100,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={CRACK_IMG}
            alt=""
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 0.88,
            }}
          />
        </Box>
      )}
    </>
  );
};

export default AprilFools2026;
