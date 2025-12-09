import React, { useState, useEffect, useRef } from 'react';
import { Box, CssBaseline, ThemeProvider, useMediaQuery, useTheme, Drawer } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { theme } from 'theme';
import Header from 'components/Header';
import NavigationContent from 'components/NavigationContent';
import BottomNav from 'components/BottomNav';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { currentClub } = useClubContext();
  const location = useLocation();
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(56); // Default to 56px (MUI Toolbar default)

  // Measure header height for proper spacing (only relevant on desktop now)
  useEffect(() => {
    if (isMobile) {
        setHeaderHeight(0);
        return;
    }

    const measureHeader = () => {
      // Since AppBar is fixed, we need to find it in the document
      const appBar = document.querySelector('.MuiAppBar-root');
      if (appBar) {
        const height = appBar.offsetHeight;
        setHeaderHeight(height);
      } else {
        // Fallback: measure wrapper if AppBar not found yet
        if (headerRef.current) {
          const toolbar = headerRef.current.querySelector('.MuiToolbar-root');
          if (toolbar) {
            const height = toolbar.offsetHeight;
            if (height > 0) {
              setHeaderHeight(height);
            }
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
  }, [currentClub, isMobile]); // Re-measure when club changes (affects header height) or mobile state changes

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
        {/* Desktop Header - Hidden on Mobile */}
        <Box 
            ref={headerRef} 
            sx={{ display: { xs: 'none', md: 'block' } }}
        >
          <Header 
            user={user} 
            onMenuClick={() => setDrawerOpen(true)} 
            onLogout={handleLogout} 
          />
        </Box>
        
        {/* Desktop Drawer (Left) */}
        <Drawer 
            anchor="left" 
            open={drawerOpen} 
            onClose={() => setDrawerOpen(false)}
        >
            <NavigationContent 
                onClose={() => setDrawerOpen(false)}
                onLogout={handleLogout}
                isMobile={false}
            />
        </Drawer>

        {/* Mobile Menu Drawer (Right) */}
        <Drawer
            anchor="right"
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            PaperProps={{
                sx: { width: '85%', maxWidth: 300 }
            }}
        >
            <NavigationContent
                onClose={() => setMobileMenuOpen(false)}
                onLogout={handleLogout}
                isMobile={true}
            />
        </Drawer>

        {/* Spacer for fixed header (Desktop only) */}
        <Box sx={{ height: `${headerHeight}px`, flexShrink: 0, display: { xs: 'none', md: 'block' } }} />

        <Box 
          component="main"
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            overflow: 'auto',
            minHeight: 0,
            WebkitOverflowScrolling: 'touch', // Smooth scrolling on iOS
            pb: { xs: 7, md: 0 } // Add padding bottom on mobile for BottomNav
          }}
        >
          {children}
        </Box>

        {/* Mobile Bottom Nav - Hidden on Desktop */}
        <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <BottomNav onMenuClick={() => setMobileMenuOpen(true)} />
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Layout;
