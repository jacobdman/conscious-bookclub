import React from 'react';
// UI
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
// Components
import DevTools from 'components/DevTools';
// Utils
import { theme } from 'theme';

const Dev = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          height: '100vh',
          bgcolor: 'background.default',
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          py: { xs: 3, md: 6 },
        }}
      >
        <DevTools />
      </Box>
    </ThemeProvider>
  );
};

export default Dev;
