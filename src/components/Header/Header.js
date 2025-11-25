import React, { useState } from 'react';
import {
  AppBar,
  Avatar,
  IconButton,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Box,
  Divider,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import { useNavigate } from 'react-router-dom';
import useClubContext from 'contexts/Club';

const Header = ({ user, onMenuClick, onLogout }) => {
  const { currentClub } = useClubContext();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate('/profile');
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  return (
    <AppBar 
      position="fixed" 
      color="primary"
      sx={{
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
      }}
    >
      <Toolbar>
        <IconButton edge="start" color="inherit" onClick={onMenuClick}>
          <MenuIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Typography variant="h6">
            Welcome, {user?.displayName || user?.email || 'User'}!
          </Typography>
          {currentClub && (
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.75rem' }}>
              {currentClub.name}
            </Typography>
          )}
        </Box>
        <IconButton
          color="inherit"
          onClick={handleAvatarClick}
          sx={{ p: 0 }}
        >
          <Avatar src={user?.photoURL} alt={user?.displayName || user?.email} />
        </IconButton>
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={handleMenuClose}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
        >
          <MenuItem onClick={handleProfile}>
            <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
            Profile
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1, fontSize: 20 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
