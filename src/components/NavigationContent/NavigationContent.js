import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemText,
  Typography,
  Divider,
  ListItemIcon,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
} from '@mui/material';
import { OpenInNew, ExitToApp } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import useClubContext from 'contexts/Club';
import FeedContext from 'contexts/Feed/FeedContext';
import { useContext } from 'react';

const NavigationContent = ({ onClose, onLogout, isMobile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentClub, userClubs, setCurrentClub, loading: clubsLoading } = useClubContext();
  // FeedContext may not be available if not on Feed page, so use useContext with try/catch
  const feedContext = useContext(FeedContext);
  const unreadCount = feedContext?.unreadCount || 0;
  const [appVersion, setAppVersion] = useState('');
  const [versionTapCount, setVersionTapCount] = useState(0);
  const versionTapTimeoutRef = useRef(null);

  // Fetch app version
  useEffect(() => {
    fetch('/version.json')
      .then((res) => res.json())
      .then((data) => setAppVersion(data.version || ''))
      .catch(() => setAppVersion(''));
  }, []);

  // Organize menu items into logical groups
  const canManageClub = ['owner', 'admin'].includes(currentClub?.role);
  const canManageMeetings = ['owner', 'admin', 'calendar-admin'].includes(currentClub?.role);

  const clubManagementItems = [];
  if (canManageClub) {
    clubManagementItems.push({ name: 'Manage Club', path: '/club/manage' });
  }
  if (canManageMeetings) {
    clubManagementItems.push({ name: 'Meetings', path: '/meetings' });
  }

  const mainNavigationItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Feed', path: '/feed' },
    { name: 'Club', path: '/club' },
    { name: 'Book List', path: '/books' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Goals', path: '/goals' },
  ];

  // Mobile specific items (replacing main nav on mobile)
  const mobileProfileItems = [
    { name: 'My Profile & Settings', path: '/profile' },
    { name: 'Calendar', path: '/calendar' },
  ];

  const comingSoonItems = [];

  const handleNavigation = (path) => {
    navigate(path);
    if (onClose) onClose();
  };

  const handleExternalLink = (url) => {
    window.open(url, '_blank');
    if (onClose) onClose();
  };

  const handleClubChange = async (event) => {
    const newClubId = event.target.value;
    
    // Special value to navigate to join club page
    if (newClubId === 'join-new-club') {
      navigate('/join-club');
      if (onClose) onClose();
      return;
    }
    
    try {
      await setCurrentClub(newClubId);
      if (onClose) onClose();
    } catch (err) {
      console.error('Failed to switch club:', err);
    }
  };

  const handleVersionTap = () => {
    const nextCount = versionTapCount + 1;
    setVersionTapCount(nextCount);

    if (versionTapTimeoutRef.current) {
      clearTimeout(versionTapTimeoutRef.current);
    }

    versionTapTimeoutRef.current = setTimeout(() => {
      setVersionTapCount(0);
    }, 2000);

    if (nextCount >= 15) {
      setVersionTapCount(0);
      navigate('/dev');
      if (onClose) onClose();
    }
  };

  return (
    <Box sx={{ 
      width: isMobile ? '100%' : 250, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      p: 2 
    }} role="presentation">
      <Typography variant="h6" sx={{ mb: 2 }}>
          {isMobile ? 'Menu' : 'Navigation'}
      </Typography>
      
      {/* Club selector */}
      {!clubsLoading && userClubs.length > 0 && (
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel id="club-select-label">Club</InputLabel>
          <Select
            labelId="club-select-label"
            id="club-select"
            value={currentClub?.id || ''}
            label="Club"
            onChange={handleClubChange}
            size="small"
          >
            {userClubs.map((club) => (
              <MenuItem key={club.id} value={club.id}>
                {club.name}
              </MenuItem>
            ))}
            <Divider sx={{ my: 0.5 }} />
            <MenuItem value="join-new-club">
              <Typography variant="body2" color="primary">
                + Join New Club
              </Typography>
            </MenuItem>
          </Select>
        </FormControl>
      )}

      {/* Club Management (Moved here for mobile view or general consistency) */}
      {isMobile && clubManagementItems.length > 0 && (
        <>
            <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary', fontWeight: 'medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Club Management
            </Typography>
            <List sx={{ py: 0, mb: 1 }}>
                {clubManagementItems.map((item) => (
                <ListItem 
                    button 
                    key={item.name}
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: location.pathname === item.path ? 'action.selected' : 'action.hover',
                    '&:hover': {
                        bgcolor: 'action.hover',
                    },
                    }}
                >
                    <ListItemText primary={item.name} />
                </ListItem>
                ))}
            </List>
            <Divider sx={{ my: 1 }} />
        </>
      )}
      
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        
        {/* Mobile: Profile Section */}
        {isMobile && (
            <>
                <List sx={{ py: 0, mb: 1 }}>
                    {mobileProfileItems.map((item) => (
                    <ListItem 
                        button 
                        key={item.name}
                        onClick={() => handleNavigation(item.path)}
                        selected={location.pathname === item.path}
                        sx={{
                        bgcolor: location.pathname === item.path ? 'action.selected' : 'transparent',
                        borderRadius: 1,
                        mb: 0.5,
                        '&:hover': {
                            bgcolor: 'action.hover',
                        },
                        }}
                    >
                        <ListItemText primary={item.name} />
                    </ListItem>
                    ))}
                </List>
                <Divider sx={{ my: 1 }} />
            </>
        )}

        {/* Club Management Section (Desktop Only - kept separate for desktop layout preference if needed, or unified) */}
        {!isMobile && clubManagementItems.length > 0 && (
          <>
            <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary', fontWeight: 'medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Club Management
            </Typography>
            <List sx={{ py: 0, mb: 1 }}>
              {clubManagementItems.map((item) => (
                <ListItem 
                  button 
                  key={item.name}
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    bgcolor: location.pathname === item.path ? 'action.selected' : 'action.hover',
                    borderRadius: 1,
                    mb: 0.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                    },
                  }}
                >
                  <ListItemText primary={item.name} />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 1 }} />
          </>
        )}

        {/* Main Navigation Section - Hidden on Mobile */}
        {!isMobile && (
            <>
                <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary', fontWeight: 'medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Navigation
                </Typography>
                <List sx={{ py: 0, mb: 1 }}>
                {mainNavigationItems.map((item) => {
                    const showBadge = item.name === 'Feed' && unreadCount > 0;
                    return (
                    <ListItem 
                    button 
                    key={item.name}
                    onClick={() => handleNavigation(item.path)}
                    selected={location.pathname === item.path}
                    >
                        <ListItemText 
                        primary={
                            showBadge ? (
                            <Badge 
                                badgeContent={unreadCount > 99 ? '99+' : unreadCount} 
                                color="error"
                                anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                                }}
                                sx={{
                                '& .MuiBadge-badge': {
                                    fontSize: '0.7rem',
                                    minWidth: '18px',
                                    height: '18px',
                                    padding: '0 4px',
                                    top: -4,
                                    right: -8,
                                },
                                }}
                            >
                                <span>{item.name}</span>
                            </Badge>
                            ) : (
                            item.name
                            )
                        } 
                        />
                    </ListItem>
                    );
                })}
                </List>
            </>
        )}

        {/* Coming Soon Section */}
        {comingSoonItems.length > 0 && (
          <>
            <Divider sx={{ my: 1 }} />
            <List sx={{ py: 0, mb: 1 }}>
              {comingSoonItems.map((item) => (
                <ListItem 
                  button 
                  key={item.name}
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  disabled={item.disabled}
                >
                  <ListItemText primary={item.name} sx={{ color: 'text.secondary' }} />
                </ListItem>
              ))}
            </List>
          </>
        )}

        <List sx={{ py: 0 }}>
          <ListItem 
            button 
            onClick={() => handleNavigation('/landing')}
          >
            <ListItemText 
              primary="Landing Page" 
              sx={{ color: 'text.secondary' }} 
            />
          </ListItem>
        </List>
      </Box>

      {/* Sticky bottom section */}
      <Box sx={{ 
        mt: 'auto', 
        pt: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        zIndex: 1
      }}>
        <List sx={{ py: 0 }}>
            {/* Sign Out Moved Here */}
            <ListItem button onClick={() => { if(onLogout) onLogout(); if(onClose) onClose(); }} sx={{ mb: 1 }}>
                <ListItemIcon sx={{ minWidth: 32 }}>
                    <ExitToApp sx={{ color: 'error.main', fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText 
                    primary="Sign Out" 
                    sx={{ 
                        color: 'error.main',
                        '& .MuiListItemText-primary': {
                            fontWeight: 'medium',
                        }
                    }} 
                />
            </ListItem>
            
            <Divider sx={{ mb: 1 }} />

          <ListItem 
            button 
            onClick={() => handleExternalLink('https://forms.gle/jJzitZf44X4r2EPB8')}
            sx={{ py: 0.5, px: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <OpenInNew sx={{ color: 'primary.main', fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText 
              primary="REQUEST FEATURE" 
              sx={{ 
                color: 'primary.main',
                fontWeight: 'medium',
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem'
                }
              }} 
            />
          </ListItem>
          <ListItem 
            button 
            onClick={() => handleExternalLink('https://forms.gle/wawNHs8zAtXvE4NH7')}
            sx={{ py: 0.5, px: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 32 }}>
              <OpenInNew sx={{ color: 'error.main', fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText 
              primary="REPORT BUG" 
              sx={{ 
                color: 'error.main',
                fontWeight: 'medium',
                '& .MuiListItemText-primary': {
                  fontSize: '0.875rem'
                }
              }} 
            />
          </ListItem>
        </List>
        {appVersion && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              textAlign: 'center',
              color: 'text.secondary',
              fontSize: '0.65rem',
              mt: 1,
              opacity: 0.6,
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={handleVersionTap}
          >
            v{appVersion}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default NavigationContent;
