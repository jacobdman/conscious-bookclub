import React from 'react';
import {
  Box,
  Container,
  Typography,
  ThemeProvider,
  CssBaseline,
  Paper,
  Divider,
  Chip,
} from '@mui/material';
import { theme } from '../../theme';
import PublicHeader from 'components/PublicHeader';
import { Link } from 'react-router-dom';

const Themes = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', bgcolor: 'background.default', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <PublicHeader />

        {/* Scrollable Content */}
        <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          <Container maxWidth="md" sx={{ py: { xs: 4, md: 8 } }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, md: 8 },
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
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.5rem' },
                  lineHeight: 1.2,
                }}
              >
                Meeting Themes
              </Typography>
              <Divider sx={{ mb: { xs: 4, md: 6 }, borderWidth: 2, borderColor: 'primary.main', opacity: 0.3 }} />

              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, md: 4 },
                  mb: { xs: 3, md: 4 },
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  borderLeft: '4px solid',
                  borderColor: 'primary.main',
                }}
              >
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
                  Intro
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
                  The CBC method involves rotating themes for our monthly meetings. Three themes makes for a convenient quarterly structure that helps with goals and reading. This format keeps members engaged with a variety of books while keeping consistent themes from quarter to quarter. Bringing an idea of personal development into philosophy, or creativity into business. It also makes meetings fun and unique from month to month.
                <br />
                <br />
                  Read more about the CBC method in our <Link to="/theory" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' }}>Theory post</Link>.
                </Typography>
              </Paper>

              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, md: 4 },
                  mb: { xs: 3, md: 4 },
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  borderLeft: '4px solid',
                  borderColor: '#8B6F47',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 600,
                      color: 'primary.main',
                      fontSize: { xs: '1.5rem', md: '2rem' },
                    }}
                  >
                    Classy (Body)
                  </Typography>
                  <Chip label="Body" size="small" sx={{ bgcolor: '#8B6F47', color: 'white', fontWeight: 600 }} />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: '1rem', md: '1.125rem' },
                    lineHeight: 1.8,
                    color: 'text.primary',
                    mb: 3,
                  }}
                >
                  The classy theme is about personal development physically. This relates to fitness, money, or discipline. This is also the night we set quarterly goals. Classy nights mark the start of the quarter.  
                  We have found success in doing a review of the last quarters goals, then discussing the book, then finally creating new goals as the book discussion will often influence the creation of our goals.
                </Typography>
              </Paper>

              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, md: 4 },
                  mb: { xs: 3, md: 4 },
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  borderLeft: '4px solid',
                  borderColor: '#6B8E9F',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 600,
                      color: 'primary.main',
                      fontSize: { xs: '1.5rem', md: '2rem' },
                    }}
                  >
                    Creative (Mind)
                  </Typography>
                  <Chip label="Mind" size="small" sx={{ bgcolor: '#6B8E9F', color: 'white', fontWeight: 600 }} />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: '1rem', md: '1.125rem' },
                    lineHeight: 1.8,
                    color: 'text.primary',
                    mb: 3,
                  }}
                >
                  Creative night is usually focused on a fiction book, or a book on the importance of creativity. This night is the most flexible with a large gap of time dedicated to "being creative"! We've had members perform musical pieces, we've had writing clubs reading chapters submitted by members, we've even had members perform their own poetry.  
                  The book discussion can be a walkthrough of the book, talking about the characters, the plot, the themes, etc. or it can be a discussion about the importance of creativity in our lives. It's an exercise in being critical of created works, but also a chance to learn to truly appreciate them.
                </Typography>
              </Paper>

              <Paper
                elevation={2}
                sx={{
                  p: { xs: 2, md: 4 },
                  bgcolor: 'background.default',
                  borderRadius: 2,
                  borderLeft: '4px solid',
                  borderColor: '#9B7A5A',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 600,
                      color: 'primary.main',
                      fontSize: { xs: '1.5rem', md: '2rem' },
                    }}
                  >
                    Curious (Spirit)
                  </Typography>
                  <Chip label="Spirit" size="small" sx={{ bgcolor: '#9B7A5A', color: 'white', fontWeight: 600 }} />
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: '1rem', md: '1.125rem' },
                    lineHeight: 1.8,
                    color: 'text.primary',
                  }}
                >
                  Curious night is dedicated to the discussion. We open with a "retro" to discuss the previous quarter's meetings and make notes on how to improve them for the next quarter. From there we go right into the book discussion. Members will bring up topics introduced in the book and we'll allow time to deeply discuss each one.
                </Typography>
              </Paper>
            </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Themes;

