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

const googleBooksService = {
  searchBooks,
  debouncedSearchBooks,
  getBookById
};

export default googleBooksService;
