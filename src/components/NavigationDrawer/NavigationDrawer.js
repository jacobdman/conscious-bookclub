import React from 'react';
import {
  Box,
  Drawer,
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
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import useClubContext from 'contexts/Club';

const NavigationDrawer = ({ open, onClose, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentClub, userClubs, setCurrentClub, loading: clubsLoading } = useClubContext();

  // Organize menu items into logical groups
  const clubManagementItems = currentClub?.role === 'owner' ? [
    { name: 'Manage Club', path: '/club/manage' },
    { name: 'Meetings', path: '/meetings' },
  ] : [];

  const mainNavigationItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Club', path: '/club' },
    { name: 'Book List', path: '/books' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Goals', path: '/goals' },
  ];

  const comingSoonItems = [
    { name: 'Feed - (Coming Soon)', path: '/feed', disabled: true },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const handleExternalLink = (url) => {
    window.open(url, '_blank');
    onClose();
  };

  const handleClubChange = async (event) => {
    const newClubId = event.target.value;
    
    // Special value to navigate to join club page
    if (newClubId === 'join-new-club') {
      navigate('/join-club');
      onClose();
      return;
    }
    
    try {
      await setCurrentClub(newClubId);
      onClose();
    } catch (err) {
      console.error('Failed to switch club:', err);
    }
  };

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ 
        width: 250, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        p: 2 
      }} role="presentation">
        <Typography variant="h6" sx={{ mb: 2 }}>Navigation</Typography>
        
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
        
        {/* Main navigation items */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Club Management Section (Owner Only) */}
          {clubManagementItems.length > 0 && (
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

          {/* Main Navigation Section */}
          <Typography variant="caption" sx={{ px: 2, py: 1, color: 'text.secondary', fontWeight: 'medium', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Navigation
          </Typography>
          <List sx={{ py: 0, mb: 1 }}>
            {mainNavigationItems.map((item) => (
              <ListItem 
                button 
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
              >
                <ListItemText primary={item.name} />
              </ListItem>
            ))}
          </List>

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

          {/* Sign Out */}
          <Divider sx={{ my: 1 }} />
          <List sx={{ py: 0 }}>
            <ListItem button onClick={onLogout}>
              <ListItemText primary="Sign Out" sx={{ color: 'text.secondary' }} />
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
          <Divider sx={{ mb: 1 }} />
          <List sx={{ py: 0 }}>
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
        </Box>
      </Box>
    </Drawer>
  );
};

export default NavigationDrawer;
