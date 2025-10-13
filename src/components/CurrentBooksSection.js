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
  
  const formatDiscussionDate = (date) => {
    if (!date) return 'TBD';
    
    let discussionDate;
    if (date.seconds) {
      discussionDate = new Date(date.seconds * 1000);
    } else {
      discussionDate = new Date(date);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const discussionDay = new Date(discussionDate);
    discussionDay.setHours(0, 0, 0, 0);
    
    const diffTime = discussionDay - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Tomorrow';
    } else if (diffDays > 1) {
      return `In ${diffDays} days`;
    } else {
      return discussionDate.toLocaleDateString();
    }
  };
  
  return (
    <Box>
      <Typography variant="h6" gutterBottom>Upcoming Book Discussions</Typography>
      {books?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No upcoming book discussions scheduled. Add discussion dates to books to see them here.
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
                Discussion: {formatDiscussionDate(book.discussionDate)}
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
