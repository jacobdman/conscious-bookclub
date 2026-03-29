import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Typography,
} from '@mui/material';
import { useAuth } from 'AuthContext';
import { getUserBookProgress, getAllUsersProgressForBook } from 'services/progress/progress.service';
import useClubContext from 'contexts/Club';
import { useMeetings } from 'hooks/useMeetings';
import { parseLocalDate } from 'utils/dateHelpers';
import { bookCoverImgSx } from 'utils/bookCoverDisplay';
import BookInfoDialog from 'components/BookInfoDialog';
import { setOpenLibraryCoverSize, OL_COVER_SIZE } from 'services/openLibraryService';

const getMyProgressChip = (chosenForBookclub, progress) => {
  if (!chosenForBookclub) {
    return { label: 'Not a club read', color: 'default', variant: 'outlined' };
  }
  const st = progress?.status;
  if (st === 'finished') {
    return { label: 'Finished', color: 'success' };
  }
  if (st === 'reading') {
    return { label: 'Started', color: 'primary' };
  }
  return { label: 'Not started', color: 'default', variant: 'outlined' };
};

const formatClubFinishBlurb = (finishedCount) => {
  if (finishedCount === 0) {
    return 'No one finished yet';
  }
  return `${finishedCount} ${finishedCount === 1 ? 'member' : 'members'} finished`;
};

const CurrentBooksSection = ({ books }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const queryClient = useQueryClient();
  const [bookProgress, setBookProgress] = useState({});
  const [clubFinishedByBookId, setClubFinishedByBookId] = useState({});
  const [selectedBook, setSelectedBook] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const { data: meetingsList = [] } = useMeetings(currentClub?.id, user?.uid, {});
  const meetingDates = React.useMemo(() => {
    const datesMap = {};
    (meetingsList || []).forEach((meeting) => {
      if (meeting.bookId) {
        const meetingDate = parseLocalDate(meeting.date);
        if (!datesMap[meeting.bookId] || meetingDate < parseLocalDate(datesMap[meeting.bookId])) {
          datesMap[meeting.bookId] = meeting.date;
        }
      }
    });
    return datesMap;
  }, [meetingsList]);

  const fetchFinishCountsForBooks = useCallback(async (bookList) => {
    if (!bookList || bookList.length === 0) {
      return {};
    }
    const countEntries = await Promise.all(
      bookList.map(async (book) => {
        try {
          const all = await getAllUsersProgressForBook(book.id);
          const n = Array.isArray(all) ? all.filter((p) => p.status === 'finished').length : 0;
          return [book.id, n];
        } catch {
          return [book.id, 0];
        }
      }),
    );
    return Object.fromEntries(countEntries);
  }, []);

  useEffect(() => {
    if (!books || books.length === 0) {
      setBookProgress({});
      setClubFinishedByBookId({});
      return;
    }

    let cancelled = false;

    const load = async () => {
      const progressMap = {};
      let hasProgressInBooks = false;
      books.forEach((book) => {
        if (book.progress !== undefined) {
          hasProgressInBooks = true;
          progressMap[book.id] = book.progress;
        }
      });

      if (hasProgressInBooks) {
        if (!cancelled) setBookProgress(progressMap);
      } else if (user) {
        const results = await Promise.all(
          books.map(async (book) => {
            try {
              const progress = await getUserBookProgress(user.uid, book.id);
              return { bookId: book.id, progress };
            } catch {
              return { bookId: book.id, progress: null };
            }
          }),
        );
        if (!cancelled) {
          const m = {};
          results.forEach(({ bookId, progress }) => {
            m[bookId] = progress;
          });
          setBookProgress(m);
        }
      } else if (!cancelled) {
        setBookProgress({});
      }

      const counts = await fetchFinishCountsForBooks(books);
      if (!cancelled) {
        setClubFinishedByBookId(counts);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user, books, fetchFinishCountsForBooks]);

  const invalidateMeetings = () => {
    if (currentClub?.id && user?.uid) {
      queryClient.invalidateQueries({ queryKey: ['meetings', currentClub.id, user.uid] });
    }
  };

  const handleProgressUpdated = async (bookId, merged) => {
    setBookProgress((prev) => ({
      ...prev,
      [bookId]: merged,
    }));
    invalidateMeetings();
    if (books?.length) {
      const counts = await fetchFinishCountsForBooks(books);
      setClubFinishedByBookId(counts);
    }
  };

  const formatDiscussionDate = (date) => {
    if (!date) return 'TBD';

    const discussionDate = new Date(date);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const discussionDay = new Date(discussionDate);
    discussionDay.setHours(0, 0, 0, 0);

    const diffTime = discussionDay - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    }
    if (diffDays === 1) {
      return 'Tomorrow';
    }
    if (diffDays > 1) {
      return `In ${diffDays} days`;
    }
    return discussionDate.toLocaleDateString();
  };

  const getDiscussionTheme = (book) => {
    if (book?.meetingTheme) {
      return book.meetingTheme;
    }
    if (Array.isArray(book?.theme)) {
      return book.theme.length > 0 ? book.theme[0] : 'General';
    }
    return book?.theme || 'General';
  };

  const openBookInfo = (book) => {
    setSelectedBook(book);
    setInfoOpen(true);
  };

  const handleInfoClose = () => {
    setInfoOpen(false);
    setSelectedBook(null);
  };

  const dialogBook = selectedBook
    ? {
        ...selectedBook,
        progress: bookProgress[selectedBook.id] ?? selectedBook.progress,
      }
    : null;

  return (
    <Box>
      <Typography variant="h6" gutterBottom data-tour="dashboard-books-title">
        Upcoming Book Discussions
      </Typography>
      {books?.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No upcoming book discussions scheduled. Add discussion dates to books to see them here.
        </Typography>
      )}
      <Box sx={{ display: 'flex', overflowX: 'auto', gap: 2 }}>
        {books?.map((book, index) => {
          const progress = bookProgress[book.id];
          const chip = getMyProgressChip(book.chosenForBookclub, progress);
          const finishedCount = clubFinishedByBookId[book.id];
          const finishBlurb =
            finishedCount === undefined
              ? null
              : formatClubFinishBlurb(finishedCount);

          return (
            <Card
              key={book.id ?? index}
              sx={{ minWidth: 200, cursor: 'pointer' }}
              onClick={() => openBookInfo(book)}
            >
              <CardMedia
                component="img"
                image={
                  book.coverImage
                    ? setOpenLibraryCoverSize(book.coverImage, OL_COVER_SIZE.L)
                    : '/logo192.png'
                }
                alt={book.title}
                sx={bookCoverImgSx({ height: 300, width: '100%', display: 'block' })}
              />
              <CardContent>
                <Typography variant="subtitle1">{book.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {book.author}
                </Typography>
                <Typography variant="caption" display="block">
                  Discussion: {formatDiscussionDate(meetingDates[book.id])}
                </Typography>
                {meetingDates[book.id] && (
                  <Typography variant="caption" display="block" color="text.secondary">
                    (
                    {new Date(meetingDates[book.id]).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    )
                  </Typography>
                )}
                <Typography variant="caption" display="block" gutterBottom>
                  Theme: {getDiscussionTheme(book)}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mt: 1 }}>
                  <Chip label={chip.label} size="small" color={chip.color} variant={chip.variant || 'filled'} />
                </Box>
                {finishBlurb != null && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                    {finishBlurb}
                  </Typography>
                )}
              </CardContent>
            </Card>
          );
        })}
      </Box>

      <BookInfoDialog
        open={infoOpen}
        onClose={handleInfoClose}
        book={dialogBook}
        discussionDate={dialogBook ? meetingDates[dialogBook.id] : null}
        onBookProgressUpdated={handleProgressUpdated}
      />
    </Box>
  );
};

export default CurrentBooksSection;
