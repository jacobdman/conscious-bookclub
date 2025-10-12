import React, { useState } from 'react';
import { Button, Box, Alert } from '@mui/material';
import { seedBooks } from '../utils/seedBooks';

const SeedBooksButton = () => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const handleSeedBooks = async () => {
    setIsSeeding(true);
    setMessage('');
    
    try {
      await seedBooks();
      setMessage('Books successfully added to Firestore!');
    } catch (error) {
      setMessage('Error adding books: ' + error.message);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Button 
        variant="contained" 
        onClick={handleSeedBooks}
        disabled={isSeeding}
        sx={{ mb: 1 }}
      >
        {isSeeding ? 'Adding Books...' : 'Seed Sample Books'}
      </Button>
      
      {message && (
        <Alert severity={message.includes('Error') ? 'error' : 'success'}>
          {message}
        </Alert>
      )}
    </Box>
  );
};

export default SeedBooksButton;
