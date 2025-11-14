import React from 'react';
import { Box, Container, Typography, Link as MuiLink, Stack, Divider } from '@mui/material';
import { Link } from 'react-router-dom';
import { OpenInNew } from '@mui/icons-material';

const PublicFooter = () => {
  return (
    <Box
      sx={{
        py: 4,
        borderTop: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        mt: 4,
      }}
    >
      <Container maxWidth="lg">
        <Stack spacing={3} alignItems="center">
          {/* Quick Links */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center' }}>
            <MuiLink
              component={Link}
              to="/theory"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '0.875rem',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              Theory
            </MuiLink>
            <MuiLink
              component={Link}
              to="/themes"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '0.875rem',
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              Themes
            </MuiLink>
            <MuiLink
              href="https://forms.gle/jJzitZf44X4r2EPB8"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': {
                  color: 'primary.main',
                  textDecoration: 'underline',
                },
              }}
            >
              Request Feature
              <OpenInNew sx={{ fontSize: 14 }} />
            </MuiLink>
            <MuiLink
              href="https://forms.gle/wawNHs8zAtXvE4NH7"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: 'text.secondary',
                textDecoration: 'none',
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '&:hover': {
                  color: 'error.main',
                  textDecoration: 'underline',
                },
              }}
            >
              Report Bug
              <OpenInNew sx={{ fontSize: 14 }} />
            </MuiLink>
          </Box>

          <Divider sx={{ width: '100%', maxWidth: 400 }} />

          {/* Copyright and Built by */}
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '0.875rem', mb: 1 }}
            >
              © 2025 Conscious Book Club
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '0.875rem' }}
            >
              Built by{' '}
              <Box
                component="a"
                href="https://jacobdayton.com"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '0.9rem',
                  color: 'primary.main',
                  textDecoration: 'none',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                jacobdayton.com
              </Box>
            </Typography>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
};

export default PublicFooter;

