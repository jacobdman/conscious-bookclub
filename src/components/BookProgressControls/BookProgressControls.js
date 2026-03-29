import React, { useState, useEffect, useCallback } from 'react';
import { Box, Button, TextField, Typography, CircularProgress } from '@mui/material';
import { updateUserBookProgress } from 'services/progress/progress.service';

/**
 * Inline reading progress: status cycle + optional % input.
 * @param {object} props
 * @param {object|null} props.user - Auth user (required for default save)
 * @param {number|string} props.bookId
 * @param {boolean} props.chosenForBookclub
 * @param {object|null|undefined} props.initialProgress - Server progress for this book
 * @param {(bookId: number|string, data: object) => Promise<void>} [props.saveProgress] - Override API (e.g. BooksContext optimistic update)
 * @param {(bookId: number|string, merged: object) => void} [props.onProgressUpdated] - After successful save (invalidate queries, lift state)
 * @param {boolean} [props.showStatusLine=true]
 */
const BookProgressControls = ({
  user,
  bookId,
  chosenForBookclub,
  initialProgress,
  saveProgress: saveProgressProp,
  onProgressUpdated,
  showStatusLine = true,
}) => {
  const [progress, setProgress] = useState(initialProgress ?? null);
  const [loading, setLoading] = useState(false);
  const [percentInput, setPercentInput] = useState('');

  useEffect(() => {
    setProgress(initialProgress ?? null);
  }, [bookId, initialProgress]);

  const saveProgress = useCallback(
    async (id, data) => {
      if (saveProgressProp) {
        await saveProgressProp(id, data);
        return;
      }
      if (!user) return;
      await updateUserBookProgress(user.uid, id, data);
    },
    [saveProgressProp, user],
  );

  const mergeAndNotify = useCallback(
    (updateData) => {
      let merged;
      setProgress((prev) => {
        merged = { ...prev, ...updateData };
        return merged;
      });
      if (onProgressUpdated && merged) {
        onProgressUpdated(bookId, merged);
      }
    },
    [bookId, onProgressUpdated],
  );

  const getButtonText = () => {
    const st = progress?.status;
    if (!progress || st === 'not_started' || st === 'not-started') {
      return 'Mark as Started';
    }
    if (st === 'reading') {
      return 'Mark as Finished';
    }
    if (st === 'finished') {
      return 'Mark as Started';
    }
    return 'Mark as Started';
  };

  const handleProgressUpdate = async () => {
    if (!user && !saveProgressProp) return;

    setLoading(true);
    try {
      const currentProgress = progress;
      let updateData = {};

      if (!currentProgress || currentProgress.status === 'not_started' || currentProgress.status === 'not-started') {
        updateData = {
          status: 'reading',
          startedAt: new Date(),
          privacy: 'public',
        };
      } else if (currentProgress.status === 'reading') {
        updateData = {
          status: 'finished',
          finishedAt: new Date(),
          percentComplete: 100,
          privacy: 'public',
        };
      } else if (currentProgress.status === 'finished') {
        updateData = {
          status: 'reading',
          startedAt: new Date(),
          finishedAt: null,
          percentComplete: null,
          privacy: 'public',
        };
      }

      await saveProgress(bookId, updateData);
      mergeAndNotify(updateData);
    } finally {
      setLoading(false);
    }
  };

  const handlePercentChange = (value) => {
    setPercentInput(value);
  };

  const updatePercentProgress = async () => {
    if (!user && !saveProgressProp) return;

    const percentInt = parseInt(String(percentInput !== '' ? percentInput : progress?.percentComplete ?? ''), 10);
    if (Number.isNaN(percentInt) || percentInt < 0 || percentInt > 100) return;

    setLoading(true);
    try {
      let updateData = {
        percentComplete: percentInt,
        privacy: 'public',
      };

      if (percentInt === 100 && progress?.status === 'reading') {
        updateData = {
          ...updateData,
          status: 'finished',
          finishedAt: new Date(),
        };
      }

      await saveProgress(bookId, updateData);
      mergeAndNotify(updateData);
    } finally {
      setLoading(false);
    }
  };

  const status = progress?.status;
  const showPercentRow =
    chosenForBookclub && (status === 'reading' || status === 'finished');

  const percentFieldValue =
    percentInput !== '' ? percentInput : progress?.percentComplete ?? '';

  if (!chosenForBookclub) {
    return (
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
        Not selected for book club reading yet.
      </Typography>
    );
  }

  return (
    <Box>
      {showStatusLine && progress && (
        <Typography variant="caption" display="block" sx={{ mb: 1 }}>
          Status: {progress.status}
          {progress.percentComplete != null && progress.percentComplete !== ''
            ? ` (${progress.percentComplete}%)`
            : ''}
        </Typography>
      )}

      <Button
        variant="outlined"
        size="small"
        onClick={handleProgressUpdate}
        disabled={loading}
        sx={{ mb: 1 }}
      >
        {loading ? <CircularProgress size={16} /> : getButtonText()}
      </Button>

      {showPercentRow && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            type="number"
            placeholder="%"
            value={percentFieldValue}
            onChange={(e) => handlePercentChange(e.target.value)}
            inputProps={{ min: 0, max: 100 }}
            sx={{ width: 60 }}
          />
          <Button size="small" variant="text" onClick={updatePercentProgress} disabled={loading}>
            Update %
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default BookProgressControls;
