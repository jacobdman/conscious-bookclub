import React from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, Avatar } from '@mui/material';
import { Home, Message, CheckCircle, MenuBook } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from 'AuthContext';

const BottomNav = ({ onMenuClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const getValue = (path) => {
    if (path === '/') return 0;
    if (path === '/feed') return 1;
    if (path === '/goals') return 2;
    if (path === '/books') return 3;
    return -1; // No selection for other paths
  };

  const [value, setValue] = React.useState(getValue(location.pathname));

  React.useEffect(() => {
    setValue(getValue(location.pathname));
  }, [location.pathname]);

  const handleChange = (event, newValue) => {
    if (newValue === 4) {
      // Menu/Profile action
      onMenuClick();
    } else {
      setValue(newValue);
      switch (newValue) {
        case 0:
          navigate('/');
          break;
        case 1:
          navigate('/feed');
          break;
        case 2:
          navigate('/goals');
          break;
        case 3:
          navigate('/books');
          break;
        default:
          break;
      }
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
        value={value}
        onChange={handleChange}
        sx={{
            backgroundColor: 'primary.main',
            px: 3,
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
        <BottomNavigationAction label="Home" icon={<Home />} />
        <BottomNavigationAction label="Feed" icon={<Message />} />
        <BottomNavigationAction label="Goals" icon={<CheckCircle />} />
        <BottomNavigationAction label="Books" icon={<MenuBook />} />
        <BottomNavigationAction 
            label="Menu" 
            icon={
                <Avatar 
                    src={user?.photoURL} 
                    alt="Profile" 
                    sx={{ width: 26, height: 26 }} 
                />
            } 
        />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;

