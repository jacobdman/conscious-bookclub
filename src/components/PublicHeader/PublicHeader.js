import React from 'react';
import { Box, Container, Tabs, Tab } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';

const PublicHeader = ({ showOnScroll = false, isVisible = true }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (event, newValue) => {
    if (newValue === 0) {
      navigate('/landing');
    } else if (newValue === 1) {
      navigate('/theory');
    } else {
      navigate('/themes');
    }
  };

  const getCurrentTab = () => {
    if (location.pathname === '/theory') return 1;
    if (location.pathname === '/themes') return 2;
    return 0;
  };

  const currentTab = getCurrentTab();

  return (
    <Box
      sx={{
        flexShrink: 0,
        bgcolor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        boxShadow: 2,
        ...(showOnScroll && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
          transition: 'transform 0.3s ease-in-out',
        }),
      }}
    >
      <Container maxWidth="lg">
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: '1.1rem',
              fontWeight: 600,
              minHeight: 64,
            },
          }}
        >
          <Tab label="Landing" />
          <Tab label="Theory" />
          <Tab label="Themes" />
        </Tabs>
      </Container>
    </Box>
  );
};

export default PublicHeader;

