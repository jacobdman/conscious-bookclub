import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// UI
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
// Context
import useClubContext from 'contexts/Club';
// Services
import { getBooksPage } from 'services/books/books.service';

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 500;

const BookSearch = ({
  value,
  onChange,
  label = 'Book (Optional)',
  helperText,
  placeholder = 'Search books...',
  disabled = false,
  enabled = true,
}) => {
  const { currentClub } = useClubContext();
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const searchTimeoutRef = useRef(null);

  const fetchBooks = useCallback(async (pageNum, search) => {
    if (!currentClub) return;
    try {
      setLoadingBooks(true);
      const result = await getBooksPage(
        currentClub.id,
        pageNum,
        PAGE_SIZE,
        'created_at',
        'desc',
        null,
        null,
        search
      );
      const newBooks = result.books || [];
      setBooks((prev) => (pageNum === 1 ? newBooks : [...prev, ...newBooks]));
      setHasMore(newBooks.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error loading books:', err);
    } finally {
      setLoadingBooks(false);
    }
  }, [currentClub]);

  const getBookLabel = useCallback((book) => {
    if (!book) return '';
    return `${book.title}${book.author ? ` by ${book.author}` : ''}`;
  }, []);

  useEffect(() => {
    if (!enabled || !currentClub) return;
    setPage(1);
    setHasMore(true);
    setBooks([]);
    setInputValue('');
    fetchBooks(1, '');
  }, [enabled, currentClub, fetchBooks]);

  useEffect(() => {
    if (value) {
      setInputValue(getBookLabel(value));
    } else {
      setInputValue('');
    }
  }, [value, getBookLabel]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (event, newInputValue, reason) => {
    setInputValue(newInputValue);

    if (reason === 'reset') {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
      fetchBooks(1, newInputValue);
    }, SEARCH_DEBOUNCE_MS);
  };

  const options = useMemo(() => {
    if (value && !books.some((book) => book.id === value.id)) {
      return [value, ...books];
    }
    return books;
  }, [books, value]);

  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={(event, newValue) => {
        if (onChange) {
          onChange(newValue);
        }
      }}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      loading={loadingBooks}
      disabled={disabled || !currentClub}
      filterOptions={(optionList) => optionList}
      isOptionEqualToValue={(option, selected) => option?.id === selected?.id}
      getOptionLabel={(option) => getBookLabel(option)}
      noOptionsText={inputValue ? 'No books found' : 'Start typing to search'}
      ListboxProps={{
        onScroll: (event) => {
          const listboxNode = event.currentTarget;
          if (
            listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 20 &&
            hasMore &&
            !loadingBooks
          ) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchBooks(nextPage, inputValue);
          }
        },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          helperText={helperText}
          fullWidth
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loadingBooks ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => (
        <li {...props} key={option.id}>
          {option.title} {option.author ? `by ${option.author}` : ''}
        </li>
      )}
    />
  );
};

export default BookSearch;
