import React, { useState } from 'react';
import {
  TextField,
  Button,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import { requestClubCreation } from 'services/support/support.service';

const ClubCreationRequest = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!name.trim() || !email.trim() || !message.trim()) {
      setError('Please fill in all fields');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      await requestClubCreation(name.trim(), email.trim(), message.trim());
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.');
      console.error('Error submitting club creation request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 4 }}>
      <form onSubmit={handleSubmit}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(false)}>
            Thank you! Your request has been submitted. We'll get back to you soon.
          </Alert>
        )}

        <TextField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          fullWidth
          required
          sx={{ mb: 2 }}
          disabled={loading}
        />

        <TextField
          label="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          fullWidth
          required
          multiline
          rows={4}
          sx={{ mb: 2 }}
          disabled={loading}
          placeholder="Tell us about your book club idea..."
        />

        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          disabled={loading || !name.trim() || !email.trim() || !message.trim()}
          sx={{ py: 1.5 }}
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Submitting...
            </>
          ) : (
            'Submit Request'
          )}
        </Button>
      </form>
    </Paper>
  );
};

export default ClubCreationRequest;

