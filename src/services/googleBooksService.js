// Google Books API service for autocomplete functionality
const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com/books/v1/volumes';

// Debounce utility to limit API calls
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Map Google Books categories to our genre list
const mapCategoryToGenre = (categories) => {
  if (!categories || !Array.isArray(categories)) return '';
  
  const categoryMap = {
    'self-help': 'Personal Development',
    'psychology': 'Psychology & Decision Making',
    'business': 'Business & Entrepreneurship',
    'health': 'Health & Wellness',
    'religion': 'Mindfulness & Spirituality',
    'philosophy': 'Philosophy & Resilience',
    'biography': 'History & Biography',
    'science': 'Science & Technology',
    'technology': 'Science & Technology',
    'leadership': 'Leadership & Productivity',
    'productivity': 'Leadership & Productivity',
    'mindfulness': 'Mindfulness & Spirituality',
    'spirituality': 'Mindfulness & Spirituality',
    'creativity': 'Creativity & Innovation',
    'innovation': 'Creativity & Innovation',
    'relationships': 'Relationships & Communication',
    'communication': 'Relationships & Communication'
  };

  // Find the first matching category
  for (const category of categories) {
    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (lowerCategory.includes(key)) {
        return value;
      }
    }
  }
  
  return '';
};

// Parse Google Books API response
const parseBookData = (item) => {
  const volumeInfo = item.volumeInfo || {};
  
  return {
    id: item.id,
    title: volumeInfo.title || '',
    authors: volumeInfo.authors || [],
    author: volumeInfo.authors ? volumeInfo.authors.join(', ') : '',
    description: volumeInfo.description || '',
    categories: volumeInfo.categories || [],
    genre: mapCategoryToGenre(volumeInfo.categories),
    coverUrl: volumeInfo.imageLinks?.thumbnail || volumeInfo.imageLinks?.smallThumbnail || '',
    publishedDate: volumeInfo.publishedDate || '',
    pageCount: volumeInfo.pageCount || null,
    language: volumeInfo.language || 'en',
    publisher: volumeInfo.publisher || ''
  };
};

// Search books using Google Books API
export const searchBooks = async (query, maxResults = 10) => {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const searchQuery = encodeURIComponent(query.trim());
    const url = `${GOOGLE_BOOKS_API_BASE}?q=${searchQuery}&maxResults=${maxResults}&printType=books`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items) {
      return [];
    }
    
    return data.items.map(parseBookData);
  } catch (error) {
    console.error('Error searching books:', error);
    return [];
  }
};

// Debounced search function to avoid excessive API calls
export const debouncedSearchBooks = debounce(async (query, callback) => {
  const results = await searchBooks(query);
  callback(results);
}, 300);

// Get book details by ID (for future use)
export const getBookById = async (bookId) => {
  try {
    const url = `${GOOGLE_BOOKS_API_BASE}/${bookId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const data = await response.json();
    return parseBookData(data);
  } catch (error) {
    console.error('Error fetching book details:', error);
    return null;
  }
};

export default {
  searchBooks,
  debouncedSearchBooks,
  getBookById
};
