import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button } from '@mui/material';

const GoalCompletionShareDialog = ({
  open,
  onClose,
  onConfirm,
  completionLabel = 'this goal',
}) => {
  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Share your completion?</DialogTitle>
      <DialogContent>
        <Typography variant="body1">
          You have completed {completionLabel}. Would you like to share with the club?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Not now</Button>
        <Button onClick={handleConfirm} variant="contained">
          Share
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GoalCompletionShareDialog;
