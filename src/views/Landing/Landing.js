import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  Grid,
  Card,
  CardContent,
  Paper,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Chip,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ClubCreationRequest from 'components/ClubCreationRequest';
import { theme } from '../../theme';
import { getStorageFileUrl } from 'services/storage';

const Landing = () => {
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [imageUrls, setImageUrls] = useState({});
  const [imagesLoading, setImagesLoading] = useState(true);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleGetStarted = () => {
    scrollToSection('ready-to-start');
  };

  const handleLearnMore = () => {
    scrollToSection('see-it-in-action');
  };

  const handleJoinWithInvite = () => {
    if (inviteCode.trim()) {
      navigate(`/login?inviteCode=${encodeURIComponent(inviteCode.trim().toUpperCase())}`);
    }
  };

  // Load landing page images from Firebase Storage
  useEffect(() => {
    const loadImages = async () => {
      try {
        setImagesLoading(true);
        // Map feature sections to their corresponding images
        const imageMap = {
          'goals-dashboard': 'landing_images/dashboard.png',
          'leaderboards': 'landing_images/club_goals.PNG',
          'calendar-events': 'landing_images/calendar.PNG',
        };

        const urls = {};
        await Promise.all(
          Object.entries(imageMap).map(async ([key, path]) => {
            try {
              const url = await getStorageFileUrl(path);
              if (url) urls[key] = url;
            } catch (error) {
              console.warn(`Could not load image: ${path}`, error);
            }
          })
        );
        setImageUrls(urls);
      } catch (error) {
        console.error('Error loading landing images:', error);
      } finally {
        setImagesLoading(false);
      }
    };

    loadImages();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Hero Section */}
        <Box
          sx={{
            background: 'linear-gradient(135deg, #F5F1EA 0%, #BFA480 100%)',
            py: { xs: 10, md: 16 },
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Container maxWidth="lg">
            <Typography
              variant="h1"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 'bold',
                color: 'primary.main',
                mb: 3,
                fontSize: { xs: '3rem', sm: '4rem', md: '5rem' },
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
            >
              Conscious Book Club
            </Typography>
            <Typography
              variant="h4"
              color="text.secondary"
              sx={{
                mb: 6,
                maxWidth: 800,
                mx: 'auto',
                fontSize: { xs: '1.25rem', md: '1.5rem' },
                lineHeight: 1.6,
              }}
            >
              Build communities of fellow readers, track goals, and build meaningful
              habits together.
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: 3,
                  justifyContent: 'center',
                  flexWrap: 'wrap',
                }}
              >
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGetStarted}
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: '1.2rem',
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: 4,
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleLearnMore}
                  sx={{
                    px: 6,
                    py: 2,
                    fontSize: '1.2rem',
                    textTransform: 'none',
                    fontWeight: 600,
                    borderWidth: 2,
                    '&:hover': {
                      borderWidth: 2,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  Learn More
                </Button>
              </Box>
              <Button
                variant="text"
                size="medium"
                onClick={() => navigate('/login')}
                sx={{
                  fontSize: '0.9rem',
                  textTransform: 'none',
                  fontWeight: 500,
                  color: 'text.secondary',
                  '&:hover': {
                    color: 'primary.main',
                    backgroundColor: 'transparent',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Sign In
              </Button>
            </Box>
          </Container>
        </Box>

        {/* Features & Screenshots Combined Section */}
        <Box id="see-it-in-action" sx={{ py: { xs: 8, md: 12 }, scrollMarginTop: '80px' }}>
          <Container maxWidth="lg">
            <Typography
              variant="h3"
              component="h2"
              align="center"
              gutterBottom
              sx={{ mb: { xs: 6, md: 10 }, color: 'primary.main' }}
            >
              Features
            </Typography>

            {/* Feature 1: More Than Just Books */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 4, md: 6 },
                mb: { xs: 8, md: 12 },
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: { xs: '100%', md: '50%' },
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: 8,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 12,
                  },
                }}
              >
                {imagesLoading || !imageUrls['goals-dashboard'] ? (
                  <Paper
                    sx={{
                      width: '100%',
                      aspectRatio: '4/3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.300',
                      background: 'linear-gradient(135deg, #E8E3D8 0%, #D4C9B0 100%)',
                    }}
                  >
                    {imagesLoading ? (
                      <CircularProgress />
                    ) : (
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                        Screenshot: Goals Dashboard
                      </Typography>
                    )}
                  </Paper>
                ) : (
                  <Box
                    component="img"
                    src={imageUrls['goals-dashboard']}
                    alt="Goals Dashboard"
                    sx={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { md: 4 } }}>
                <Typography
                  variant="h4"
                  component="h3"
                  gutterBottom
                  sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}
                >
                  More Than Just Books
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ mb: 3, lineHeight: 1.6, fontSize: '1.1rem' }}
                >
                  Track both personal and reading goals in one place. Build consistent
                  habits beyond just reading and see your overall progress over time.
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mt: 3,
                  }}
                >
                  <Chip label="Goal Tracking" sx={{ bgcolor: 'primary.main', color: 'white' }} />
                  <Chip label="Progress Analytics" sx={{ bgcolor: 'secondary.main', color: 'white' }} />
                  <Chip label="Habit Building" sx={{ bgcolor: 'primary.main', color: 'white', opacity: 0.8 }} />
                </Box>
              </Box>
            </Box>

            {/* Feature 2: Collaboration & Competition */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row-reverse' },
                gap: { xs: 4, md: 6 },
                mb: { xs: 8, md: 12 },
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: { xs: '100%', md: '50%' },
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: 8,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 12,
                  },
                }}
              >
                {imagesLoading || !imageUrls['leaderboards'] ? (
                  <Paper
                    sx={{
                      width: '100%',
                      aspectRatio: '4/3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.300',
                      background: 'linear-gradient(135deg, #E8E3D8 0%, #D4C9B0 100%)',
                    }}
                  >
                    {imagesLoading ? (
                      <CircularProgress />
                    ) : (
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                        Screenshot: Leaderboards
                      </Typography>
                    )}
                  </Paper>
                ) : (
                  <Box
                    component="img"
                    src={imageUrls['leaderboards']}
                    alt="Leaderboards"
                    sx={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { md: 4 } }}>
                <Typography
                  variant="h4"
                  component="h3"
                  gutterBottom
                  sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}
                >
                  Collaboration & Competition
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ mb: 3, lineHeight: 1.6, fontSize: '1.1rem' }}
                >
                  Compete with your book club members on reading metrics, streaks, and
                  goal completion. Stay motivated through friendly competition and see
                  how you stack up against your peers.
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mt: 3,
                  }}
                >
                  <Chip label="Leaderboards" sx={{ bgcolor: 'primary.main', color: 'white' }} />
                  <Chip label="Streaks" sx={{ bgcolor: 'secondary.main', color: 'white' }} />
                  <Chip label="Metrics" sx={{ bgcolor: 'primary.main', color: 'white', opacity: 0.8 }} />
                </Box>
              </Box>
            </Box>

            {/* Feature 3: Custom Calendars & Events */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: { xs: 4, md: 6 },
                mb: { xs: 4, md: 6 },
                alignItems: 'center',
              }}
            >
              <Box
                sx={{
                  width: { xs: '100%', md: '50%' },
                  borderRadius: 3,
                  overflow: 'hidden',
                  boxShadow: 8,
                  transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 12,
                  },
                }}
              >
                {imagesLoading || !imageUrls['calendar-events'] ? (
                  <Paper
                    sx={{
                      width: '100%',
                      aspectRatio: '4/3',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: 'grey.300',
                      background: 'linear-gradient(135deg, #E8E3D8 0%, #D4C9B0 100%)',
                    }}
                  >
                    {imagesLoading ? (
                      <CircularProgress />
                    ) : (
                      <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                        Screenshot: Calendar & Events
                      </Typography>
                    )}
                  </Paper>
                ) : (
                  <Box
                    component="img"
                    src={imageUrls['calendar-events']}
                    alt="Calendar & Events"
                    sx={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                    }}
                  />
                )}
              </Box>
              <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { md: 4 } }}>
                <Typography
                  variant="h4"
                  component="h3"
                  gutterBottom
                  sx={{ mb: 2, color: 'primary.main', fontWeight: 'bold' }}
                >
                  Custom Calendars & Events
                </Typography>
                <Typography
                  variant="h6"
                  color="text.secondary"
                  sx={{ mb: 3, lineHeight: 1.6, fontSize: '1.1rem' }}
                >
                  Create custom calendars for meetings, track book lists, and manage
                  events. Everything you need to organize your book club in one place.
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                    mt: 3,
                  }}
                >
                  <Chip label="Calendar" sx={{ bgcolor: 'primary.main', color: 'white' }} />
                  <Chip label="Book Lists" sx={{ bgcolor: 'secondary.main', color: 'white' }} />
                  <Chip label="Events" sx={{ bgcolor: 'primary.main', color: 'white', opacity: 0.8 }} />
                </Box>
              </Box>
            </Box>
          </Container>
        </Box>

        {/* How It Works Section */}
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 6, color: 'primary.main' }}
          >
            How It Works
          </Typography>
          <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            <Grid container spacing={{ xs: 4, md: 6 }} justifyContent="center">
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  sx={{
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 70, md: 80 },
                      height: { xs: 70, md: 80 },
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                      fontSize: { xs: '1.75rem', md: '2rem' },
                      fontWeight: 'bold',
                    }}
                  >
                    1
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                    Sign In
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 250 }}>
                    Sign in with your Google account to get started.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  sx={{
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 70, md: 80 },
                      height: { xs: 70, md: 80 },
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                      fontSize: { xs: '1.75rem', md: '2rem' },
                      fontWeight: 'bold',
                    }}
                  >
                    2
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                    Join a Club
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 250 }}>
                    Join an existing book club with an invite code or create your own.
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Box
                  sx={{
                    textAlign: 'center',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Box
                    sx={{
                      width: { xs: 70, md: 80 },
                      height: { xs: 70, md: 80 },
                      borderRadius: '50%',
                      bgcolor: 'primary.main',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3,
                      fontSize: { xs: '1.75rem', md: '2rem' },
                      fontWeight: 'bold',
                    }}
                  >
                    3
                  </Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
                    Start Reading
                  </Typography>
                  <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 250 }}>
                    Set goals, track progress, and connect with your book club members.
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Container>

        {/* CTA Section with Invite Code */}
        <Box
          id="ready-to-start"
          sx={{
            background: 'linear-gradient(135deg, #BFA480 0%, #5D473A 100%)',
            py: 8,
            color: 'white',
            scrollMarginTop: '80px',
          }}
        >
          <Container maxWidth="md">
            <Typography variant="h3" component="h2" align="center" gutterBottom sx={{ mb: 4 }}>
              Ready to Get Started?
            </Typography>
            <Paper sx={{ p: 4, bgcolor: 'rgba(255, 255, 255, 0.95)' }}>
              <Box sx={{ mb: 3 }}>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={() => navigate('/login')}
                  sx={{ py: 1.5, fontSize: '1.1rem', textTransform: 'none' }}
                >
                  Sign In to Get Started
                </Button>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.300' }} />
                <Typography variant="body2" color="text.secondary">
                  OR
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: 'grey.300' }} />
              </Box>
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <TextField
                  label="Invite Code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Enter invite code"
                  fullWidth
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinWithInvite();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleJoinWithInvite}
                  disabled={!inviteCode.trim()}
                  sx={{
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    minWidth: { xs: '100%', sm: 'auto' },
                  }}
                >
                  Join with Code
                </Button>
              </Box>
            </Paper>
          </Container>
        </Box>

        {/* Club Creation Request Section */}
        <Container maxWidth="md" sx={{ py: 8 }}>
          <Typography
            variant="h3"
            component="h2"
            align="center"
            gutterBottom
            sx={{ mb: 4, color: 'primary.main' }}
          >
            Want to Create Your Own Club?
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Fill out the form below and we'll help you set up your own book club.
          </Typography>
          <ClubCreationRequest />
        </Container>
      </Box>
    </ThemeProvider>
  );
};

export default Landing;

