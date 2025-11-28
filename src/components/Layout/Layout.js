import React, { useState, useEffect, useRef } from 'react';
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
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(80);

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
      <Box
        sx={{
          height: '100vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box ref={headerRef}>
          <Header 
            user={user} 
            onMenuClick={() => setDrawerOpen(true)} 
            onLogout={handleLogout} 
          />
        </Box>
        
        <NavigationDrawer 
          open={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
          onLogout={handleLogout} 
        />

        {/* Spacer for fixed header */}
        <Box sx={{ height: `${headerHeight}px`, flexShrink: 0 }} />

        <Box 
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            paddingBottom: 4, // Extra padding for mobile
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Layout;
