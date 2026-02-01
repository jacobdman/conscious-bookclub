import React from 'react';
// UI
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
// Utils
import { buildTheme } from 'theme';

const SetupLayout = ({ children, themeOverrides = {} }) => (
  <ThemeProvider theme={buildTheme(themeOverrides)}>
    <CssBaseline />
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        overflowY: 'auto',
      }}
    >
      {children}
    </Box>
  </ThemeProvider>
);

export default SetupLayout;
