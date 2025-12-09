import React from 'react';
import BookList from 'components/BookList';
import BooksProvider from 'contexts/Books/BooksProvider';

const Books = () => {
  return (
    <BooksProvider>
      <BookList />
    </BooksProvider>
  );
};

export default Books;
