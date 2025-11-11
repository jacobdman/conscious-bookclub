import React from 'react';
import {
  Box,
  Container,
  Typography,
  ThemeProvider,
  CssBaseline,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { theme } from '../../theme';
import { useNavigate, useLocation } from 'react-router-dom';

const Theory = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleTabChange = (event, newValue) => {
    if (newValue === 0) {
      navigate('/landing');
    } else {
      navigate('/theory');
    }
  };

  const currentTab = location.pathname === '/theory' ? 1 : 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header Navigation */}
        <Box
          sx={{
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            boxShadow: 2,
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
            </Tabs>
          </Container>
        </Box>

        {/* Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Container maxWidth="md" sx={{ py: 8 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 8 },
                bgcolor: 'background.paper',
                borderRadius: 3,
              }}
          >
            <Typography
              variant="h2"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                color: 'primary.main',
                mb: 4,
                fontSize: { xs: '2.5rem', md: '3.5rem' },
                lineHeight: 1.2,
              }}
            >
              Our Philosophy
            </Typography>

            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                Building Conscious Communities Through Reading
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  lineHeight: 1.8,
                  color: 'text.primary',
                  mb: 3,
                }}
              >
                At Conscious Book Club, we believe that reading is more than just consuming words on a page. 
                It's a transformative practice that shapes our minds, expands our perspectives, and connects 
                us to ideas and experiences beyond our immediate world. Our platform is built on the 
                fundamental principle that meaningful growth happens in community—when we read together, 
                discuss together, and grow together.
              </Typography>
            </Box>

            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                Beyond the Book
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  lineHeight: 1.8,
                  color: 'text.primary',
                  mb: 3,
                }}
              >
                We recognize that personal development extends far beyond reading alone. That's why we've 
                created a platform that tracks not just your reading progress, but your broader personal 
                goals and habits. Whether it's meditation, exercise, creative writing, or any other 
                practice that enriches your life, we believe these habits work in harmony with reading 
                to create a more conscious, intentional way of living.
              </Typography>
            </Box>

            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                The Power of Accountability
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  lineHeight: 1.8,
                  color: 'text.primary',
                  mb: 3,
                }}
              >
                Friendly competition and shared accountability are powerful motivators. Our leaderboards, 
                streaks, and goal-tracking features aren't about creating pressure—they're about creating 
                connection. When you see your book club members making progress, it inspires you. When 
                you share your achievements, it motivates others. This positive feedback loop creates a 
                supportive environment where everyone can thrive.
              </Typography>
            </Box>

            <Box sx={{ mb: 6 }}>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                Intentional Design
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  lineHeight: 1.8,
                  color: 'text.primary',
                  mb: 3,
                }}
              >
                Every feature we build is designed with intention. From our calendar system that helps 
                you plan meaningful discussions, to our feed that keeps you connected with your community, 
                to our goal-tracking that helps you build lasting habits—we're committed to creating tools 
                that enhance rather than distract from your reading journey. We believe technology should 
                serve your growth, not compete for your attention.
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="h5"
                component="h2"
                gutterBottom
                sx={{
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 3,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                }}
              >
                Join Us
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontSize: { xs: '1rem', md: '1.125rem' },
                  lineHeight: 1.8,
                  color: 'text.primary',
                }}
              >
                We're building a community of conscious readers who are committed to growth, connection, 
                and meaningful engagement with ideas. If this philosophy resonates with you, we'd love to 
                have you join us. Together, we can create something beautiful—one book, one goal, one 
                conversation at a time.
              </Typography>
            </Box>
          </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Theory;

