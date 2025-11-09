import React, { useState, useEffect } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { theme } from 'theme';
import Header from 'components/Header';
import NavigationDrawer from 'components/NavigationDrawer';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { currentClub } = useClubContext();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Update page title based on route and club
  useEffect(() => {
    const routeTitles = {
      '/': 'Dashboard',
      '/books': 'Books',
      '/goals': 'Goals',
      '/calendar': 'Calendar',
      '/club': 'Club',
      '/club/manage': 'Manage Club',
      '/profile': 'Profile',
      '/meetings': 'Meetings',
    };

    const pageTitle = routeTitles[location.pathname] || 'Dashboard';
    const clubName = currentClub?.name || '';
    const title = clubName ? `${clubName} - ${pageTitle}` : pageTitle;
    
    document.title = title;
  }, [location.pathname, currentClub]);

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

      <Box 
        component="main"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: 'calc(100vh - 64px)', // AppBar default height
          overflow: 'hidden',
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
};

export default Layout;
