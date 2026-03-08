import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Services
import {
  getBooksPage,
  getBooksPageFiltered,
  getAllDiscussedBooks,
  addBook,
  updateBook as updateBookService,
  deleteBook as deleteBookService,
} from 'services/books/books.service';
import { getUserBookProgress } from 'services/progress/progress.service';

const sortList = (list, sort) => {
  const directionFactor = sort.direction === 'asc' ? 1 : -1;
  if (sort.field === 'likes') {
    return [...list].sort((a, b) => ((a.likesCount || 0) - (b.likesCount || 0)) * directionFactor);
  }
  if (sort.field === 'createdAt') {
    return [...list].sort((a, b) => {
      const aDate = a.createdAt || a.created_at;
      const bDate = b.createdAt || b.created_at;
      const aTime = aDate ? new Date(aDate).getTime() : 0;
      const bTime = bDate ? new Date(bDate).getTime() : 0;
      return (aTime - bTime) * directionFactor;
    });
  }
  if (sort.field === 'discussionDate') {
    return [...list].sort((a, b) => {
      const aDate = a.discussionDate || a.discussion_date;
      const bDate = b.discussionDate || b.discussion_date;
      const aTime = aDate ? new Date(aDate).getTime() : 0;
      const bTime = bDate ? new Date(bDate).getTime() : 0;
      return (aTime - bTime) * directionFactor;
    });
  }
  if (sort.field === 'title' || sort.field === 'author') {
    return [...list].sort((a, b) => {
      const aValue = (a[sort.field] || '').toString().toLowerCase();
      const bValue = (b[sort.field] || '').toString().toLowerCase();
      if (aValue < bValue) return -1 * directionFactor;
      if (aValue > bValue) return 1 * directionFactor;
      return 0;
    });
  }
  return list;
};

const fetchBooks = async (clubId, userId, options = {}) => {
  const {
    page = 1,
    pageSize = 10,
    filters = { theme: 'all', status: 'all' },
    search = '',
    sort = { field: 'createdAt', direction: 'desc' },
  } = options;

  const { theme, status } = filters;
  const readStatus = status === 'read' ? 'finished' : null;

  if (status === 'scheduled') {
    let allScheduledBooks = await getAllDiscussedBooks(clubId, userId);

    if (theme !== 'all') {
      if (theme === 'no-theme') {
        allScheduledBooks = allScheduledBooks.filter(book => !book.theme || book.theme.length === 0);
      } else {
        allScheduledBooks = allScheduledBooks.filter(book => {
          const bookThemes = Array.isArray(book.theme) ? book.theme : [book.theme];
          return bookThemes.includes(theme);
        });
      }
    }

    if (search) {
      const lowerSearch = search.toLowerCase();
      allScheduledBooks = allScheduledBooks.filter(book =>
        book.title.toLowerCase().includes(lowerSearch) ||
        book.author.toLowerCase().includes(lowerSearch),
      );
    }

    allScheduledBooks = sortList(allScheduledBooks, sort);

    const startIdx = (page - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    const paginatedBooks = allScheduledBooks.slice(startIdx, endIdx);

    if (userId && paginatedBooks.length > 0) {
      const booksWithProgress = await Promise.all(paginatedBooks.map(async (book) => {
        try {
          const progress = await getUserBookProgress(userId, book.id);
          return { ...book, progress };
        } catch (error) {
          return book;
        }
      }));

      return {
        books: booksWithProgress,
        totalCount: allScheduledBooks.length,
      };
    }

    return {
      books: paginatedBooks,
      totalCount: allScheduledBooks.length,
    };
  }

  if (theme !== 'all') {
    return await getBooksPageFiltered(
      clubId,
      theme,
      page,
      pageSize,
      sort.field,
      sort.direction,
      userId,
      readStatus,
      search,
    );
  }

  return await getBooksPage(
    clubId,
    page,
    pageSize,
    sort.field,
    sort.direction,
    userId,
    readStatus,
    search,
  );
};

export const useBooks = (clubId, userId, options = {}) => {
  return useQuery({
    queryKey: ['books', clubId, userId, options],
    queryFn: () => fetchBooks(clubId, userId, options),
    enabled: !!clubId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateBook = (clubId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookData, userId }) => addBook(clubId, bookData, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', clubId] });
    },
  });
};

export const useUpdateBook = (clubId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bookId, updates }) => updateBookService(clubId, bookId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', clubId] });
    },
  });
};

export const useDeleteBook = (clubId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookId) => deleteBookService(clubId, bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books', clubId] });
    },
  });
};
