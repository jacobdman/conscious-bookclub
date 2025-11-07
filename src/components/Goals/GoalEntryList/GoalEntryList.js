import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

const GoalEntryList = ({ entries, goal, onEdit, onDelete, loading = false }) => {
  const formatDateTime = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">Loading entries...</Typography>
      </Box>
    );
  }

  if (!entries || entries.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary">No entries yet</Typography>
      </Box>
    );
  }

  return (
    <Paper variant="outlined" sx={{ mt: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date & Time</TableCell>
            {goal.type === 'metric' && <TableCell>Quantity</TableCell>}
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{formatDateTime(entry.occurred_at || entry.occurredAt)}</TableCell>
              {goal.type === 'metric' && (
                <TableCell>
                  <Chip
                    label={`${parseFloat(entry.quantity || 0).toFixed(1)} ${goal.unit || ''}`}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
              )}
              <TableCell align="right">
                <IconButton
                  size="small"
                  onClick={() => onEdit(entry)}
                  color="primary"
                >
                  <Edit fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => onDelete(entry)}
                  color="error"
                >
                  <Delete fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default GoalEntryList;

