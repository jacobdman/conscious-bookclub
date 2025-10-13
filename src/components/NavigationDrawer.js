import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

const NavigationDrawer = ({ open, onClose, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { name: 'Dashboard', path: '/' },
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

  return (
    <Drawer anchor="left" open={open} onClose={onClose}>
      <Box sx={{ width: 250, p: 2 }} role="presentation">
        <Typography variant="h6" sx={{ mb: 2 }}>Navigation</Typography>
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
    </Drawer>
  );
};

export default NavigationDrawer;
