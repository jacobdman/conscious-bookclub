import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Services
import {
  getBooksPage,
  getBooksPageFiltered,
  addBook,
  updateBook as updateBookService,
  deleteBook as deleteBookService,
} from 'services/books/books.service';

const fetchBooks = async (clubId, userId, options = {}) => {
  const {
    page = 1,
    pageSize = 10,
    filters = {},
    search = '',
    sort = { field: 'createdAt', direction: 'desc' },
  } = options;

  const {
    theme = 'all',
    suggestedBy = 'all',
    listScope: listScopeRaw = 'backlog',
    readByMe = false,
    suggestedByMe = false,
    likedByMe = false,
    bookmarkedOnly = false,
  } = filters;

  const listScope = listScopeRaw ?? 'backlog';
  const readStatus = readByMe ? 'finished' : null;
  let uploadedByFilter = suggestedBy && suggestedBy !== 'all' ? suggestedBy : null;
  if (suggestedByMe && userId) {
    uploadedByFilter = userId;
  }
  const likedByMeParam = Boolean(likedByMe);
  const bookmarkedOnlyParam = listScope === 'suggested' && Boolean(bookmarkedOnly);

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
      uploadedByFilter,
      listScope,
      likedByMeParam,
      bookmarkedOnlyParam,
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
    uploadedByFilter,
    listScope,
    likedByMeParam,
    bookmarkedOnlyParam,
  );
};

export const useBooks = (clubId, userId, options = {}) => {
  return useQuery({
    queryKey: ['books', clubId, userId, options],
    queryFn: () => fetchBooks(clubId, userId, options),
    enabled: !!clubId,
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
