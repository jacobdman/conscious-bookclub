import React from 'react';
import {
  AppBar,
  Avatar,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';

const Header = ({ user, onMenuClick, onLogout }) => {
  return (
    <AppBar position="static" color="primary">
      <Toolbar>
        <IconButton edge="start" color="inherit" onClick={onMenuClick}>
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" sx={{ flexGrow: 1, textAlign: 'center' }}>
          Welcome, {user?.displayName || user?.email || 'User'}!
        </Typography>
        <IconButton color="inherit" onClick={onLogout} sx={{ mr: 1 }}>
          <LogoutIcon />
        </IconButton>
        <Avatar src={user?.photoURL} alt={user?.displayName || user?.email} />
      </Toolbar>
    </AppBar>
  );
};

export default Header;
