import React, { useState, useEffect } from 'react';
import { Box, Typography, Tabs, Tab, Card, CardContent, CircularProgress } from '@mui/material';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import InFlightBooksProgress from 'components/InFlightBooksProgress';
import FinishedBooksLeaderboard from 'components/FinishedBooksLeaderboard';
import BookCompletionMetric from 'components/ClubGoalsReport/BookCompletionMetric';
import PastBooksParticipationChart from './PastBooksParticipationChart';
import PastBooksCompletionChart from './PastBooksCompletionChart';
import { getBooksReport } from 'services/clubs/booksReport.service';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`books-tabpanel-${index}`}
      aria-labelledby={`books-tab-${index}`}
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
    id: `books-tab-${index}`,
    'aria-controls': `books-tabpanel-${index}`,
  };
}

const ClubBooksTab = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [tabValue, setTabValue] = useState(0);
  const [booksReportData, setBooksReportData] = useState(null);
  const [booksReportLoading, setBooksReportLoading] = useState(false);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  // Fetch books report data when Reports tab is active
  useEffect(() => {
    const fetchBooksReport = async () => {
      if (!user || !currentClub || tabValue !== 1 || booksReportData) return;

      try {
        setBooksReportLoading(true);
        const data = await getBooksReport(currentClub.id, user.uid);
        setBooksReportData(data);
      } catch (err) {
        console.error('Error fetching books report:', err);
      } finally {
        setBooksReportLoading(false);
      }
    };

    fetchBooksReport();
  }, [user, currentClub, tabValue, booksReportData]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Club Books
      </Typography>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          aria-label="books view tabs"
        >
          <Tab label="Current" {...a11yProps(0)} />
          <Tab label="Reports" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          See how everyone is progressing on our current books and check out the reading leaderboard!
        </Typography>
        
        <Box sx={{ mb: 4 }}>
          <InFlightBooksProgress />
        </Box>
        
        <Box>
          <FinishedBooksLeaderboard />
        </Box>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        {booksReportLoading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Book Completion Rate Metric */}
            <Box sx={{ mb: 4 }}>
              <Card 
                elevation={2}
                sx={{ 
                  width: '100%',
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                    Book Completion Rate
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Percentage of past books completed by the club
                  </Typography>
                  <BookCompletionMetric bookCompletionPercentage={booksReportData?.bookCompletionPercentage} />
                </CardContent>
              </Card>
            </Box>

            {/* Past Books Participation Rate */}
            <Box sx={{ mb: 4 }}>
              <Card 
                elevation={2}
                sx={{ 
                  width: '100%',
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                    Participation Rate
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Percentage of members who started each past book
                  </Typography>
                  <PastBooksParticipationChart pastBooksProgress={booksReportData?.pastBooksProgress} />
                </CardContent>
              </Card>
            </Box>

            {/* Past Books Completion Rate */}
            <Box sx={{ mb: 4 }}>
              <Card 
                elevation={2}
                sx={{ 
                  width: '100%',
                  borderRadius: 2,
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                    Completion Rate
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    Average completion percentage for each past book
                  </Typography>
                  <PastBooksCompletionChart pastBooksProgress={booksReportData?.pastBooksProgress} />
                </CardContent>
              </Card>
            </Box>
          </>
        )}
      </TabPanel>
    </Box>
  );
};

export default ClubBooksTab;
