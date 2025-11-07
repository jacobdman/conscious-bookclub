import React, { useState } from 'react';
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
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Layout>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
        
        <TabPanel value={tabValue} index={0}>
          <ClubBooksTab />
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <ClubGoalsReport />
        </TabPanel>
      </Box>
    </Layout>
  );
};

export default ClubView;

