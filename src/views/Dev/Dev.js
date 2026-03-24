import React, { useMemo } from 'react';
// UI
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
// Context
import useClubContext from 'contexts/Club';
// Components
import DevTools from 'components/DevTools';
// Utils
import { buildTheme } from 'theme';

const Dev = () => {
  const { currentClub } = useClubContext();
  const clubTheme = useMemo(
    () => buildTheme(currentClub?.themeOverrides || {}),
    [currentClub?.themeOverrides],
  );

  return (
    <ThemeProvider theme={clubTheme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          bgcolor: 'background.default',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          paddingTop: { xs: 'calc(24px + env(safe-area-inset-top))', md: 6 },
          paddingBottom: { xs: 'calc(24px + env(safe-area-inset-bottom))', md: 6 },
        }}
      >
        <DevTools />
      </Box>
    </ThemeProvider>
  );
};

export default Dev;
