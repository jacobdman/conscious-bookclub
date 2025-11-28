import React, { useState, useEffect, useRef } from 'react';
import { Box, CssBaseline, ThemeProvider } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { theme } from 'theme';
import Header from 'components/Header';
import NavigationDrawer from 'components/NavigationDrawer';
import { setupMobileInputFocusHandler } from 'utils/mobileInputFocus';

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

  // Setup global mobile input focus handler
  useEffect(() => {
    return setupMobileInputFocusHandler();
  }, []);

  // Measure header height for proper spacing
  useEffect(() => {
    const measureHeader = () => {
      // Since AppBar is fixed, we need to find it in the document
      const appBar = document.querySelector('.MuiAppBar-root');
      if (appBar) {
        const height = appBar.offsetHeight;
        setHeaderHeight(height);
      } else {
        // Fallback: measure wrapper if AppBar not found yet
        if (headerRef.current) {
          const height = headerRef.current.offsetHeight;
          if (height > 0) {
            setHeaderHeight(height);
          }
        }
      }
    };
    
    // Measure immediately
    measureHeader();
    
    // Also measure after a delay to catch slower renders
    const timeout = setTimeout(measureHeader, 100);
    const timeout2 = setTimeout(measureHeader, 300);
    
    // Use ResizeObserver if available
    let resizeObserver;
    const appBar = document.querySelector('.MuiAppBar-root');
    if (appBar && window.ResizeObserver) {
      resizeObserver = new ResizeObserver(measureHeader);
      resizeObserver.observe(appBar);
    }
    
    return () => {
      clearTimeout(timeout);
      clearTimeout(timeout2);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [currentClub]); // Re-measure when club changes (affects header height)

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
