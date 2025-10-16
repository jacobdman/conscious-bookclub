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
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

const NavigationDrawer = ({ open, onClose, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/' },
    { name: 'Club', path: '/club' },
    { name: 'Book List', path: '/books' },
    { name: 'Calendar', path: '/calendar' },
    { name: 'Goals', path: '/goals' },
    { name: 'Feed - (Coming Soon)', path: '/feed', disabled: true },
    { name: 'Profile', path: '/profile' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    onClose();
  };

  const handleExternalLink = (url) => {
    window.open(url, '_blank');
    onClose();
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
        
        {/* Main navigation items */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem 
                button 
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                selected={location.pathname === item.path}
                disabled={item.disabled}
              >
                <ListItemText primary={item.name} sx={{ color: item.disabled ? 'text.secondary' : 'inherit' }} />
              </ListItem>
            ))}
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
