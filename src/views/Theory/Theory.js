import React from 'react';
import {
  Box,
  Container,
  Typography,
  ThemeProvider,
  CssBaseline,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import { theme } from '../../theme';
import PublicHeader from 'components/PublicHeader';
import { Link } from 'react-router-dom';

const Theory = () => {

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
                Our Philosophy
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
                Two years ago I wanted to start a book club with a focus on philosophy. I wanted to bring my existing and somewhat separate groups of friends together to continue our discussions on life, morality, religion, and other philosophical topics with a diverse range of voices.  
                <br />
                I had no idea how to do this, so I called my friends together for a "meeting 0" to discuss how to structure this new club. What we came up with was a quarterly rotation of topics keeping the club fresh and engaging for all. We've made some minor tweaks over the past few years, but ultimately the fundamentals have remained the same.  
                <br />
                <br />
                We've seen a lot of success in our club between improvements to reading habits and other regular personal goals. We've had deep discussions, made deeper friendships, and created a close group of friends who share a common goal of personal growth which helps each one of us continue to stay accountable to our goals.
                <br />
                <br />
                I'm going to further break down the philosophy of the club and how it works in the following sections. Hopefully you'll see why we're so passionate about this format, and why we needed our own platform to make it work. This is not just a book club app, it's not just a meeting planner, it's not just a goal tracker or a habit tracker. This is something larger than the sum of its parts, and hopefully it can help you as well.
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
                borderColor: 'secondary.main',
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
                The CBC Method
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
                CBC runs on a monthly discussion format, rotating through 3 themes each quarter. Discussion is the core of the club, the books are just a tool to help us frame that discussion. We understand not all of our members will read every book, but they can all contribute to a discussion about the themes of the book.  
                We also wanted meetings to be novel each time, a strictly philosophical discussion every month might become too heavy for some. For this reason we decided to rotate between 3 themes, Classy. Creative, and Curious (the Ancient Greeks might not have appreciated alliteration, but I sure do!).
                <br />
                <br />
                <b>Classy (Body):</b> A focus on classic literature, history, business, and self development.  
                <br />
                <b>Creative (Mind):</b> A focus on creativity, innovation, and new ideas.  
                <br />
                <b>Curious (Spirit):</b> A focus on philosophy and religion.
                <br />
                <br />
                Check out our <Link to="/themes" style={{ color: 'inherit', textDecoration: 'underline', fontWeight: 'bold' }}>Themes post</Link> to see a further dive into each theme. Here, I want to highlight the benefits of this format.  
                Classy night usually ends with poker, creative night is usually focused on a fiction book and sometimes ends with a movie or even an album review, and curious night is ripe for deep discussions late into the night.  
                Each night we will pick the book for the next night of the same theme, giving members 3 months to read each book. It also means members who only want to read fiction still get to learn from themes presented in other books they might not otherwise have been introduced to.  
                It also gives us a good runway to set quarterly goals and follow along with progress that feels fast and real.
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
                How to run your own club - Start with Meeting 0
              </Typography>
              <List sx={{ pl: 2 }}>
                <ListItem sx={{ display: 'list-item', listStyleType: 'decimal', pl: 1 }}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: { xs: '1rem', md: '1.125rem' },
                          lineHeight: 1.8,
                          color: 'text.primary',
                        }}
                      >
                        Pick a time frame that works for you. Don't feel confined to monthly meetings with a quarterly rotation of themes. This is what works for us, but this app (and our own meetings) will only continue to grow with experimentation and feedback
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem sx={{ display: 'list-item', listStyleType: 'decimal', pl: 1 }}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: { xs: '1rem', md: '1.125rem' },
                          lineHeight: 1.8,
                          color: 'text.primary',
                        }}
                      >
                        Be serious about goals. Pick meaningful goals that will reflect real exciting progress, but are legitimately achievable. We have 4 different concepts for goals (habits, metrics, milestones, one-offs) to help with tracking.
                      </Typography>
                    }
                  />
                </ListItem>
                <ListItem sx={{ display: 'list-item', listStyleType: 'decimal', pl: 1 }}>
                  <ListItemText
                    primary={
                      <Typography
                        variant="body1"
                        sx={{
                          fontSize: { xs: '1rem', md: '1.125rem' },
                          lineHeight: 1.8,
                          color: 'text.primary',
                        }}
                      >
                        Finally, and most important with a discussion based group like this, keep criticisms welcome. "Unspoken expectations are premeditated resentments." - Neil Strauss. Don't shy away from disagreement, raise differing opinions often. The ability to disagree is a muscle that can atrophy if not practiced. Quiet contempt in a group about open opinions is a recipe for disaster (or at the very least, uninteresting conversation!)
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
            </Paper>

            <Paper
              elevation={2}
              sx={{
                p: { xs: 3, md: 4 },
                bgcolor: 'background.default',
                borderRadius: 2,
                borderLeft: '4px solid',
                borderColor: 'secondary.main',
                textAlign: 'center',
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
              <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontStyle: 'italic',
                    color: 'text.secondary',
                    fontSize: { xs: '0.9rem', md: '1rem' },
                  }}
                >
                  - Jacob Dayton
                </Typography>
              </Box>
            </Paper>
          </Paper>
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default Theory;

