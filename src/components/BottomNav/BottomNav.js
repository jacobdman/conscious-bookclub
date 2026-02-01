import React from 'react';
import { Home, Message, CheckCircle, MenuBook } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
// UI
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Utils
import { getClubFeatures } from 'utils/clubFeatures';
// Components
import ProfileAvatar from 'components/ProfileAvatar';

const BottomNav = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const features = getClubFeatures(currentClub);

  const navItems = [
    { label: 'Home', icon: <Home />, path: '/' },
    { label: 'Feed', icon: <Message />, path: '/feed' },
    { label: 'Goals', icon: <CheckCircle />, path: '/goals', feature: 'goals' },
    { label: 'Books', icon: <MenuBook />, path: '/books', feature: 'books' },
  ].filter((item) => !item.feature || features[item.feature]);

  const currentValue = navItems.find((item) => item.path === location.pathname)?.path || false;

  const handleChange = (event, newValue) => {
    if (newValue === 'menu') {
      // Menu/Profile action
      onMenuClick();
    } else {
      navigate(newValue);
    }
  };

  return (
    <Paper 
      sx={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1100,
        borderRadius: 0,
      }} 
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={currentValue}
        onChange={handleChange}
        sx={{
            backgroundColor: (theme) =>
                theme.palette.mode === 'dark'
                  ? theme.palette.background.paper
                  : theme.palette.primary.main,
            px: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
            '& .MuiBottomNavigationAction-root': {
                color: 'rgba(255, 255, 255, 0.7)',
                minWidth: 'auto',
                '&.Mui-selected': {
                    color: '#fff',
                },
                '& .MuiSvgIcon-root': {
                    fontSize: '1.5rem',
                },
            },
        }}
      >
        {navItems.map((item) => (
          <BottomNavigationAction key={item.path} label={item.label} icon={item.icon} value={item.path} />
        ))}
        <BottomNavigationAction 
            label="Menu" 
            value="menu"
            icon={
                <ProfileAvatar 
                    user={user}
                    size={26}
                    alt="Profile"
                    disableGoalModal
                    showEntryRing={false}
                />
            } 
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;

