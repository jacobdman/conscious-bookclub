import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { fetchWorkEditionCovers } from 'services/openLibraryService';
import { bookCoverAvatarSx } from 'utils/bookCoverDisplay';

const COVER_LIMIT = 15;

const CoverPickerDialog = ({ open, onClose, workKey, onPickOlCover, onPickCustomCover }) => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState('');

  useEffect(() => {
    if (!open) {
      setCustomUrl('');
      setCustomError('');
      return;
    }

    let cancelled = false;
    const load = async () => {
      if (!workKey || typeof workKey !== 'string' || !workKey.includes('/works/')) {
        setOptions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const list = await fetchWorkEditionCovers(workKey, COVER_LIMIT);
      if (!cancelled) {
        setOptions(list);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, workKey]);

  const handleCustomApply = () => {
    const trimmed = customUrl.trim();
    if (!trimmed) {
      setCustomError('Enter a URL');
      return;
    }
    try {
      const u = new URL(trimmed);
      if (!/^https?:$/i.test(u.protocol)) {
        throw new Error('invalid protocol');
      }
    } catch {
      setCustomError('Enter a valid URL');
      return;
    }
    setCustomError('');
    onPickCustomCover(trimmed);
    onClose();
  };

  const handleOlClick = (opt) => {
    onPickOlCover(opt);
    onClose();
  };

  const hasWork = Boolean(workKey && String(workKey).includes('/works/'));

  const formatMetaLine = (opt) => {
    const parts = [opt.languageLabel, opt.year].filter(Boolean);
    return parts.join(' · ');
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Choose cover</DialogTitle>
      <DialogContent>
        {hasWork && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Open Library editions (up to {COVER_LIMIT})
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                <CircularProgress size={32} />
              </Box>
            ) : options.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No edition covers found. Add a custom image URL below.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  gap: 2,
                  overflowX: 'auto',
                  py: 1,
                  pb: 2,
                }}
              >
                {options.map((opt) => (
                  <Box
                    key={`${opt.editionKey}-${opt.coverImage}`}
                    component="button"
                    type="button"
                    onClick={() => handleOlClick(opt)}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 1,
                      cursor: 'pointer',
                      bgcolor: 'background.paper',
                      flexShrink: 0,
                      width: 112,
                      textAlign: 'left',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 0.75,
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <Avatar
                      src={opt.coverImage}
                      alt=""
                      variant="rounded"
                      sx={bookCoverAvatarSx({
                        width: '100%',
                        height: 120,
                        alignSelf: 'center',
                      })}
                    />
                    <Typography
                      variant="caption"
                      component="div"
                      sx={{
                        fontWeight: 600,
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        wordBreak: 'break-word',
                      }}
                      title={opt.editionTitle}
                    >
                      {opt.editionTitle}
                    </Typography>
                    {opt.editionDetail ? (
                      <Typography
                        variant="caption"
                        component="div"
                        color="text.secondary"
                        sx={{
                          lineHeight: 1.2,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                        title={opt.editionDetail}
                      >
                        {opt.editionDetail}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" component="div" color="text.secondary" sx={{ lineHeight: 1.2 }}>
                      {formatMetaLine(opt) || '—'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {!hasWork && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Pick a book from Open Library search to browse edition covers, or use a custom URL below.
          </Typography>
        )}

        <Typography variant="subtitle2" gutterBottom>
          Or: custom image URL
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <TextField
            size="small"
            fullWidth
            placeholder="https://…"
            value={customUrl}
            onChange={(e) => {
              setCustomUrl(e.target.value);
              setCustomError('');
            }}
            error={Boolean(customError)}
            helperText={customError}
          />
          <Button variant="outlined" onClick={handleCustomApply}>
            Apply URL
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CoverPickerDialog;
