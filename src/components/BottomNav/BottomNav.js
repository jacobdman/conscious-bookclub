import React, { useState, useEffect, startTransition, useContext } from 'react';
import { Home, Message, CheckCircle, MenuBook } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
// UI
import { BottomNavigation, BottomNavigationAction, Paper, Badge } from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useKeyboardContext from 'contexts/Keyboard';
import FeedContext from 'contexts/Feed/FeedContext';
// Utils
import { getClubFeatures } from 'utils/clubFeatures';
// Components
import ProfileAvatar from 'components/ProfileAvatar';

const BottomNav = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const { keyboardVisible } = useKeyboardContext();
  const feedContext = useContext(FeedContext);
  const unreadCount = feedContext?.unreadCount ?? 0;
  const features = getClubFeatures(currentClub);

  const navItems = [
    { label: 'Home', icon: <Home />, path: '/', dataTour: 'nav-home' },
    { label: 'Feed', icon: <Message />, path: '/feed', dataTour: 'nav-feed', showUnreadBadge: true },
    { label: 'Goals', icon: <CheckCircle />, path: '/goals', feature: 'goals', dataTour: 'nav-goals' },
    { label: 'Books', icon: <MenuBook />, path: '/books', feature: 'books', dataTour: 'nav-books' },
  ].filter((item) => !item.feature || features[item.feature]);

  const currentValue = navItems.find((item) => item.path === location.pathname)?.path || false;
  const [optimisticPath, setOptimisticPath] = useState(null);
  const value = optimisticPath ?? currentValue;

  useEffect(() => {
    setOptimisticPath(null);
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    if (newValue === 'menu') {
      onMenuClick();
    } else {
      setOptimisticPath(newValue);
      startTransition(() => navigate(newValue));
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
        paddingBottom: 'env(safe-area-inset-bottom)',
        visibility: keyboardVisible ? 'hidden' : 'visible',
      }} 
      data-tour="nav-container"
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={value}
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
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={
              item.showUnreadBadge && unreadCount > 0 ? (
                <Badge
                  badgeContent={unreadCount > 99 ? '99+' : unreadCount}
                  color="error"
                  anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                  sx={{
                    '& .MuiBadge-badge': {
                      fontSize: '0.65rem',
                      minWidth: '16px',
                      height: '16px',
                      padding: '0 3px',
                      top: -2,
                      right: -4,
                    },
                  }}
                >
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )
            }
            value={item.path}
            data-tour={item.dataTour}
          />
        ))}
        <BottomNavigationAction 
            label="Menu" 
            value="menu"
            data-tour="nav-menu"
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

