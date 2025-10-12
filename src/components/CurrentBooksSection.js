import React from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Typography,
} from '@mui/material';

const CurrentBooksSection = ({ books }) => {
  console.log("CurrentBooksSection received books:", books);
  console.log("Books length:", books?.length);
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Current Books</Typography>
      {books?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No books found. Try adding some books to your collection.
        </Typography>
      )}
      <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2 }}>
        {books?.map((book, index) => (
          <Card key={index} sx={{ minWidth: 200 }}>
            <CardMedia
              component="img"
              height="300"
              image={book.coverUrl || '/logo192.png'}
              alt={book.title}
            />
            <CardContent>
              <Typography variant="subtitle1">{book.title}</Typography>
              <Typography variant="body2" color="text.secondary">{book.author}</Typography>
              <Typography variant="caption" display="block">
                Discussion: {book.discussionDate ? new Date(book.discussionDate).toLocaleDateString() : 'TBD'}
              </Typography>
              <Typography variant="caption" display="block" gutterBottom>
                Theme: {book.theme || 'General'}
              </Typography>
              <Button variant="outlined" size="small">Mark as Read</Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default CurrentBooksSection;
