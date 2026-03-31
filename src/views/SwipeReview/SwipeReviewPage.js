import React, { useMemo, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import SwipeReviewProvider from 'contexts/SwipeReview/SwipeReviewProvider';
import SwipeReview from 'components/SwipeReview/SwipeReview';
import { buildTheme } from 'theme';
import { resolveThemeOverrides } from 'utils/themeResolver';
import { syncIosKeyboardForTheme, syncIosStatusBarForTheme, syncIosWindowBackground } from 'utils/capacitorNative';

/**
 * Discover / swipe uses the same club + user theme resolution as Layout (books, dashboard, etc.).
 */
const SwipeReviewView = () => {
  const { userProfile } = useAuth();
  const { currentClub } = useClubContext();

  const userThemeOverrides = userProfile?.settings?.clubThemeOverrides || {};
  const userClubThemeOverride =
    userThemeOverrides[String(currentClub?.id)] || userThemeOverrides.all;

  const clubTheme = useMemo(() => {
    const baseOverrides = currentClub?.themeOverrides || {};
    const effectiveOverrides = resolveThemeOverrides(baseOverrides, userClubThemeOverride);
    return buildTheme(effectiveOverrides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentClub?.id, currentClub?.themeOverrides, userClubThemeOverride]);

  useEffect(() => {
    syncIosStatusBarForTheme(clubTheme.palette.mode);
    syncIosKeyboardForTheme(clubTheme.palette.mode);
    syncIosWindowBackground(clubTheme.palette.background.default);
  }, [clubTheme.palette.mode, clubTheme.palette.background.default]);

  return (
    <ThemeProvider theme={clubTheme}>
      <CssBaseline />
      <SwipeReviewProvider>
        <SwipeReview />
      </SwipeReviewProvider>
    </ThemeProvider>
  );
};

export default SwipeReviewView;
