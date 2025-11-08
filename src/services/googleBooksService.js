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

// Helper function to improve image quality by increasing zoom parameter
// Google Books API URLs often have zoom=1 (low quality), we can increase to zoom=3 for better quality
// Export this so components can use it for existing books in the database
export const improveImageQuality = (imageUrl) => {
  // Return as-is if no URL provided (preserve null/undefined)
  if (!imageUrl) return imageUrl;
  
  // Only process string URLs
  if (typeof imageUrl !== 'string') return imageUrl;
  
  // Only modify Google Books URLs - leave other URLs unchanged
  if (!imageUrl.includes('books.google.com')) {
    return imageUrl;
  }
  
  try {
    // If URL contains zoom parameter, increase it to 3 for better quality
    if (imageUrl.includes('zoom=')) {
      return imageUrl.replace(/zoom=\d+/, 'zoom=3');
    }
    
    // If URL doesn't have zoom parameter but is a Google Books URL, add it
    if (imageUrl.includes('printsec=frontcover') || imageUrl.includes('img=')) {
      const separator = imageUrl.includes('?') ? '&' : '?';
      return `${imageUrl}${separator}zoom=3`;
    }
  } catch (error) {
    // If anything goes wrong, return the original URL
    console.warn('Error improving image quality:', error);
    return imageUrl;
  }
  
  // Return unchanged if we can't safely modify it
  return imageUrl;
};

// Map Google Books categories to our genre list
const mapCategoryToGenre = (categories) => {
  if (!categories || !Array.isArray(categories)) return '';
  
  const categoryMap = {
    // Personal Development & Self-Help
    'self-help': 'Personal Development',
    'self help': 'Personal Development',
    'personal development': 'Personal Development',
    'motivation': 'Personal Development',
    'success': 'Personal Development',
    
    // Psychology & Decision Making
    'psychology': 'Psychology & Decision Making',
    'behavioral': 'Psychology & Decision Making',
    'cognitive': 'Psychology & Decision Making',
    'decision making': 'Psychology & Decision Making',
    'behavior': 'Psychology & Decision Making',
    
    // Business & Entrepreneurship
    'business': 'Business & Entrepreneurship',
    'entrepreneurship': 'Business & Entrepreneurship',
    'management': 'Business & Entrepreneurship',
    'marketing': 'Business & Entrepreneurship',
    'finance': 'Business & Entrepreneurship',
    'economics': 'Business & Entrepreneurship',
    
    // Health & Wellness
    'health': 'Health & Wellness',
    'wellness': 'Health & Wellness',
    'fitness': 'Health & Wellness',
    'nutrition': 'Health & Wellness',
    'medical': 'Health & Wellness',
    'medicine': 'Health & Wellness',
    
    // Mindfulness & Spirituality
    'religion': 'Mindfulness & Spirituality',
    'spirituality': 'Mindfulness & Spirituality',
    'mindfulness': 'Mindfulness & Spirituality',
    'meditation': 'Mindfulness & Spirituality',
    'buddhism': 'Mindfulness & Spirituality',
    'christianity': 'Mindfulness & Spirituality',
    'islam': 'Mindfulness & Spirituality',
    'hinduism': 'Mindfulness & Spirituality',
    'judaism': 'Mindfulness & Spirituality',
    
    // Philosophy & Resilience
    'philosophy': 'Philosophy & Resilience',
    'ethics': 'Philosophy & Resilience',
    'resilience': 'Philosophy & Resilience',
    'stoicism': 'Philosophy & Resilience',
    'existentialism': 'Philosophy & Resilience',
    
    // Leadership & Productivity
    'leadership': 'Leadership & Productivity',
    'productivity': 'Leadership & Productivity',
    'time management': 'Leadership & Productivity',
    'organization': 'Leadership & Productivity',
    'efficiency': 'Leadership & Productivity',
    
    // History & Biography
    'biography': 'History & Biography',
    'autobiography': 'History & Biography',
    'history': 'History & Biography',
    'memoir': 'History & Biography',
    'historical': 'History & Biography',
    
    // Science & Technology
    'science': 'Science & Technology',
    'technology': 'Science & Technology',
    'engineering': 'Science & Technology',
    'computer': 'Science & Technology',
    'programming': 'Science & Technology',
    'artificial intelligence': 'Science & Technology',
    'ai': 'Science & Technology',
    
    // Relationships & Communication
    'relationships': 'Relationships & Communication',
    'communication': 'Relationships & Communication',
    'social': 'Relationships & Communication',
    'family': 'Relationships & Communication',
    'marriage': 'Relationships & Communication',
    'dating': 'Relationships & Communication',
    
    // Creativity & Innovation
    'creativity': 'Creativity & Innovation',
    'innovation': 'Creativity & Innovation',
    'design': 'Creativity & Innovation',
    'art': 'Creativity & Innovation',
    'music': 'Creativity & Innovation',
    'writing': 'Creativity & Innovation',
    
    // Literature & Fiction
    'fiction': 'Literature & Fiction',
    'literature': 'Literature & Fiction',
    'literary criticism': 'Literature & Fiction',
    'poetry': 'Literature & Fiction',
    'drama': 'Literature & Fiction',
    'classic': 'Literature & Fiction',
    'novel': 'Literature & Fiction',
    'short story': 'Literature & Fiction',
    'romance': 'Literature & Fiction',
    'mystery': 'Literature & Fiction',
    'thriller': 'Literature & Fiction',
    'fantasy': 'Literature & Fiction',
    'science fiction': 'Literature & Fiction',
    'horror': 'Literature & Fiction',
    'courtship': 'Literature & Fiction',
    'adventure': 'Literature & Fiction',
    'humor': 'Literature & Fiction',
    'comedy': 'Literature & Fiction',
    'tragedy': 'Literature & Fiction',
    'epic': 'Literature & Fiction',
    'satire': 'Literature & Fiction',
    
    // Education & Reference
    'education': 'Education & Reference',
    'reference': 'Education & Reference',
    'textbook': 'Education & Reference',
    'academic': 'Education & Reference',
    'study': 'Education & Reference',
    'learning': 'Education & Reference'
  };

  // Find the first matching category
  for (const category of categories) {
    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      // Check for exact match first, then partial match
      if (lowerCategory === key || lowerCategory.includes(key)) {
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
    // Prefer larger image sizes for better quality
    // Google Books API provides: smallThumbnail, thumbnail, small, medium, large, extraLarge
    // Since covers are displayed at 300px height, use medium or larger for better quality
    // Note: We improve quality when displaying, not when storing
    coverImage: volumeInfo.imageLinks?.extraLarge || 
                volumeInfo.imageLinks?.large || 
                volumeInfo.imageLinks?.medium || 
                volumeInfo.imageLinks?.small || 
                volumeInfo.imageLinks?.thumbnail || 
                volumeInfo.imageLinks?.smallThumbnail || 
                '',
    publishedDate: volumeInfo.publishedDate || '',
    pageCount: volumeInfo.pageCount || null,
    language: volumeInfo.language || 'en',
    publisher: volumeInfo.publisher || ''
  };
};

// Search books using Google Books API
// Supports searching by title, author, or both
// Legacy support: if only title is provided (author is empty), works as before
export const searchBooks = async (title = '', author = '', maxResults = 10) => {
  const trimmedTitle = (title || '').trim();
  const trimmedAuthor = (author || '').trim();
  
  // Need at least 2 characters in title or author to search
  if (trimmedTitle.length < 2 && trimmedAuthor.length < 2) {
    return [];
  }

  try {
    let searchQuery;
    
    // Google Books API: + = AND, space = OR
    // intitle: searches title, inauthor: searches author
    
    if (trimmedTitle && trimmedAuthor) {
      // Both title and author provided: search for both together
      // This finds books with the title AND the author
      searchQuery = `intitle:${trimmedTitle}+inauthor:${trimmedAuthor}`;
    } else if (trimmedTitle) {
      // Only title provided: search in title and general (for numeric titles like "1984")
      // Use general search first (searches all fields), then title-specific
      searchQuery = `${trimmedTitle} intitle:${trimmedTitle}`;
    } else if (trimmedAuthor) {
      // Only author provided: search in author field
      searchQuery = `inauthor:${trimmedAuthor}`;
    } else {
      return [];
    }
    
    const encodedQuery = encodeURIComponent(searchQuery);
    const url = `${GOOGLE_BOOKS_API_BASE}?q=${encodedQuery}&maxResults=${maxResults}&printType=books`;
    
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
    return [];
  }
};

// Create debounced functions for both API styles
const debouncedSearchBooksOld = debounce(async (query, callback) => {
  const results = await searchBooks(query);
  callback(results);
}, 300);

const debouncedSearchBooksNew = debounce(async (title, author, callback) => {
  const results = await searchBooks(title, author);
  callback(results);
}, 300);

// Debounced search function to avoid excessive API calls
// Supports both old API (single query) and new API (title, author, callback)
export const debouncedSearchBooks = (titleOrQuery, authorOrCallback, callback) => {
  // Handle both old and new API signatures
  if (typeof authorOrCallback === 'function') {
    // Old API: debouncedSearchBooks(query, callback)
    debouncedSearchBooksOld(titleOrQuery, authorOrCallback);
  } else {
    // New API: debouncedSearchBooks(title, author, callback)
    debouncedSearchBooksNew(titleOrQuery, authorOrCallback, callback);
  }
};

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
    return null;
  }
};

const googleBooksService = {
  searchBooks,
  debouncedSearchBooks,
  getBookById
};

export default googleBooksService;
