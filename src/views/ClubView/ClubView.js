import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Tabs, Tab } from '@mui/material';
import Layout from 'components/Layout';
import ClubBooksTab from 'components/ClubBooksTab';
import ClubGoalsReport from 'components/ClubGoalsReport';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`club-tabpanel-${index}`}
      aria-labelledby={`club-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index) {
  return {
    id: `club-tab-${index}`,
    'aria-controls': `club-tabpanel-${index}`,
  };
}

const ClubView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Determine tab value from URL path
  const getTabValueFromPath = () => {
    if (location.pathname === '/club/goals') return 1;
    if (location.pathname === '/club/books') return 0;
    // Default to books if path is just /club
    return 0;
  };

  const [tabValue, setTabValue] = useState(getTabValueFromPath());

  // Redirect /club to /club/books for consistency
  useEffect(() => {
    if (location.pathname === '/club') {
      navigate('/club/books', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Update tab value when route changes
  useEffect(() => {
    setTabValue(getTabValueFromPath());
  }, [location.pathname]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    // Navigate to the corresponding route
    if (newValue === 0) {
      navigate('/club/books', { replace: true });
    } else if (newValue === 1) {
      navigate('/club/goals', { replace: true });
    }
  };

  return (
    <Layout>
      <Box sx={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            aria-label="club view tabs"
            sx={{ px: 2 }}
          >
            <Tab label="Books" {...a11yProps(0)} />
            <Tab label="Goals" {...a11yProps(1)} />
          </Tabs>
        </Box>
        
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <TabPanel value={tabValue} index={0}>
            <ClubBooksTab />
          </TabPanel>
          
          <TabPanel value={tabValue} index={1}>
            <ClubGoalsReport />
          </TabPanel>
        </Box>
      </Box>
    </Layout>
  );
};

export default ClubView;

