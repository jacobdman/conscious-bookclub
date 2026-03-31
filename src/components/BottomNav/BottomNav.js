import React, { useState, useEffect, startTransition, useContext } from 'react';
import {
  Home,
  HomeOutlined,
  Message,
  MessageOutlined,
  CheckCircle,
  CheckCircleOutline,
  MenuBook,
  MenuBookOutlined,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import { alpha } from '@mui/material/styles';
// UI
import { BottomNavigation, BottomNavigationAction, Paper, Badge } from '@mui/material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { useKeyboardContext } from 'contexts/Keyboard';
import FeedContext from 'contexts/Feed/FeedContext';
// Utils
import { getClubFeatures } from 'utils/clubFeatures';
import { getPlatform } from 'utils/platformHelpers';
import { triggerHaptic } from 'utils/haptics';
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
  const isIosNative = getPlatform() === 'ios';

  const navItems = [
    {
      label: 'Home',
      icon: isIosNative ? <HomeOutlined /> : <Home />,
      path: '/',
      dataTour: 'nav-home',
    },
    {
      label: 'Feed',
      icon: isIosNative ? <MessageOutlined /> : <Message />,
      path: '/feed',
      dataTour: 'nav-feed',
      showUnreadBadge: true,
    },
    {
      label: 'Goals',
      icon: isIosNative ? <CheckCircleOutline /> : <CheckCircle />,
      path: '/goals',
      feature: 'goals',
      dataTour: 'nav-goals',
    },
    {
      label: 'Books',
      icon: isIosNative ? <MenuBookOutlined /> : <MenuBook />,
      path: '/books',
      feature: 'books',
      dataTour: 'nav-books',
    },
  ].filter((item) => !item.feature || features[item.feature]);

  const currentValue = navItems.find((item) => item.path === location.pathname)?.path || false;
  const [optimisticPath, setOptimisticPath] = useState(null);
  const value = optimisticPath ?? currentValue;

  useEffect(() => {
    setOptimisticPath(null);
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    if (newValue === 'menu') {
      if (isIosNative) triggerHaptic('light');
      onMenuClick();
    } else {
      if (isIosNative) triggerHaptic('light');
      setOptimisticPath(newValue);
      startTransition(() => navigate(newValue));
    }
  };

  const paperSx = isIosNative
    ? {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderRadius: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
        visibility: keyboardVisible ? 'hidden' : 'visible',
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.72)
            : alpha(theme.palette.primary.main, 0.72),
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderTop: '0.5px solid',
        borderColor: (theme) =>
          theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.12) : alpha('#fff', 0.35),
        boxShadow: 'none',
      }
    : {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        borderRadius: 0,
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.primary.main,
        paddingBottom: 'env(safe-area-inset-bottom)',
        visibility: keyboardVisible ? 'hidden' : 'visible',
      };

  const bottomNavSx = isIosNative
    ? {
        minHeight: 49,
        py: 0.5,
        backgroundColor: 'transparent',
        px: 2,
        borderTop: 'none',
        '& .MuiBottomNavigationAction-root': {
          color: (theme) =>
            theme.palette.mode === 'dark' ? alpha(theme.palette.common.white, 0.55) : alpha('#fff', 0.65),
          minWidth: 'auto',
          paddingTop: 4,
          paddingBottom: 2,
          '&.Mui-selected': {
            color: (theme) =>
              theme.palette.mode === 'dark' ? theme.palette.common.white : '#fff',
          },
          '& .MuiBottomNavigationAction-label': {
            fontSize: '0.625rem',
            fontWeight: 500,
            letterSpacing: '-0.01em',
            '&.Mui-selected': { fontSize: '0.625rem' },
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.375rem',
          },
        },
      }
    : {
        backgroundColor: (theme) =>
          theme.palette.mode === 'dark' ? theme.palette.background.paper : theme.palette.primary.main,
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
      };

  return (
    <Paper
      sx={paperSx}
      data-tour="nav-container"
      elevation={isIosNative ? 0 : 3}
    >
      <BottomNavigation
        showLabels
        value={value}
        onChange={handleChange}
        sx={bottomNavSx}
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

