import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useAuth } from 'AuthContext';
import { theme } from 'theme';
import Header from 'components/Header';
import NavigationDrawer from 'components/NavigationDrawer';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      // Error logging out
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Header 
        user={user} 
        onMenuClick={() => setDrawerOpen(true)} 
        onLogout={handleLogout} 
      />
      
      <NavigationDrawer 
        open={drawerOpen} 
        onClose={() => setDrawerOpen(false)} 
        onLogout={handleLogout} 
      />

      <Box component="main">
        {children}
      </Box>
    </ThemeProvider>
  );
};

export default Layout;
