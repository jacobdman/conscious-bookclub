// Open Library API — https://openlibrary.org/developers/api
// Web: plain fetch (no custom headers) so GET stays CORS-simple.
// Native (Capacitor): same-origin requests to our API proxy; server adds User-Agent for OL rate limits.

import { isNativeApp } from 'utils/platformHelpers';
import { getApiBase } from 'services/apiHelpers';

const OPEN_LIBRARY_ORIGIN = 'https://openlibrary.org';
const SEARCH_URL = `${OPEN_LIBRARY_ORIGIN}/search.json`;

const DEBOUNCE_MS = 750;

const openLibrarySearchUrl = (queryString) => {
  if (isNativeApp()) {
    return `${getApiBase()}/v1/open-library/search?${queryString}`;
  }
  return `${SEARCH_URL}?${queryString}`;
};

const openLibraryWorkJsonUrl = (workKeyNormalized) => {
  if (isNativeApp()) {
    return `${getApiBase()}/v1/open-library/work?key=${encodeURIComponent(workKeyNormalized)}`;
  }
  return `${OPEN_LIBRARY_ORIGIN}${workKeyNormalized}.json`;
};

const openLibraryAuthorJsonUrl = (authorKey) => {
  if (isNativeApp()) {
    return `${getApiBase()}/v1/open-library/author?key=${encodeURIComponent(authorKey)}`;
  }
  return `${OPEN_LIBRARY_ORIGIN}${authorKey}.json`;
};

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

/**
 * Build cover image URL from Open Library search/work fields.
 * `cover_i` is whichever edition OL attached to the work — it may be a translation’s jacket.
 */
const buildCoverImageUrl = (doc) => {
  if (doc.cover_i != null && doc.cover_i !== '') {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
  }
  const isbns = doc.isbn;
  if (Array.isArray(isbns) && isbns.length > 0) {
    const isbn = String(isbns[0]).replace(/-/g, '');
    if (isbn) {
      return `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
    }
  }
  return '';
};

/** Club default themes — subject→theme auto-fill only when the club uses exactly these three. */
export const DEFAULT_CLUB_THEMES = ['Classy', 'Creative', 'Curious'];

/** Normalize Open Library subject lists (strings or { value, count } from work.json). */
export const normalizeOlSubjects = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
      .map((s) =>
        typeof s === 'string' ? s.trim() : String(s?.value || '').trim(),
      )
      .filter(Boolean);
};

/** First subject line from Open Library — used as genre text in the form. */
export const primaryOlGenreFromSubjects = (subjects) => {
  const list = normalizeOlSubjects(subjects);
  return list[0] || '';
};

/**
 * Map Open Library subjects to Classy / Creative / Curious when the club uses the default trio.
 */
export const mapOlSubjectsToDefaultClubThemes = (rawSubjects) => {
  const subjects = normalizeOlSubjects(rawSubjects);
  if (subjects.length === 0) return [];
  const text = subjects.slice(0, 15).join(' | ').toLowerCase();
  const out = new Set();

  if (
    /(literary|classic(s)?\b|essay|nobel|pulitzer|bildungsroman|philosophy\b|tragedy|shakespeare)/.test(
        text,
    )
  ) {
    out.add('Classy');
  }
  if (
    /(fiction|novel|fantasy|romance|science fiction|\bsci-fi\b|poetry|graphic novel|comic|art\b|music|film|story|tales|humor|comedy|creative|myth)/.test(
        text,
    )
  ) {
    out.add('Creative');
  }
  if (
    /(science\b|technology|history|biography|memoir|psychology|business|economics|health|medicine|self-help|nature|astronomy|space|mathem|politic|sociolog|true crime|nonfiction|reference|education|philosophy of)/.test(
        text,
    )
  ) {
    out.add('Curious');
  }

  if (out.size === 0 && /(fiction|fantasy|novel)/.test(text)) {
    out.add('Creative');
  } else if (out.size === 0) {
    out.add('Curious');
  }

  return Array.from(out);
};

const parseBookData = (doc) => {
  const authors = doc.author_name || [];
  const authorStr = Array.isArray(authors) ? authors.join(', ') : '';
  const subjects = normalizeOlSubjects(doc.subject);
  const firstSentence = doc.first_sentence;
  let description = '';
  if (Array.isArray(firstSentence) && firstSentence.length > 0) {
    description = String(firstSentence[0]);
  } else if (typeof firstSentence === 'string') {
    description = firstSentence;
  }

  const publishedYear = doc.first_publish_year;
  const publishedDate =
    publishedYear != null && publishedYear !== '' ? String(publishedYear) : '';

  const lang =
    Array.isArray(doc.language) && doc.language.length > 0
      ? doc.language[0]
      : typeof doc.language === 'string'
        ? doc.language
        : 'en';

  const publisher =
    Array.isArray(doc.publisher) && doc.publisher.length > 0
      ? doc.publisher[0]
      : typeof doc.publisher === 'string'
        ? doc.publisher
        : '';

  return {
    id: doc.key || '',
    title: doc.title || '',
    authors,
    author: authorStr,
    description,
    categories: subjects,
    genre: primaryOlGenreFromSubjects(subjects),
    coverImage: buildCoverImageUrl(doc),
    publishedDate,
    pageCount: doc.number_of_pages_median ?? null,
    language: lang,
    publisher,
  };
};

/**
 * Re-rank Open Library hits so exact / phrase title matches beat substring word matches.
 * (e.g. "Red Rising" before "Red Storm Rising" — the latter does not contain "red rising" contiguously.)
 */
const rankSearchDocs = (docs, titleQuery, authorQuery) => {
  const tq = titleQuery.toLowerCase().trim();
  const aq = authorQuery.toLowerCase().trim();
  const titleWords = tq.split(/\s+/).filter(Boolean);

  const wordBoundaryMatch = (haystack, word) => {
    const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`\\b${esc}\\b`, 'i').test(haystack);
  };

  const scoreDoc = (doc) => {
    const title = (doc.title || '').toLowerCase();
    const authorNames = Array.isArray(doc.author_name) ? doc.author_name : [];
    const authorsLower = authorNames.join(' ').toLowerCase();
    let s = 0;

    if (aq.length >= 2) {
      if (authorsLower.includes(aq)) {
        s += 80000;
      }
      for (const name of authorNames) {
        if (name.toLowerCase().includes(aq)) {
          s += 40000;
          break;
        }
      }
    }

    if (tq.length >= 2) {
      if (title === tq) {
        s += 200000;
      } else if (
        title.startsWith(`${tq} `) ||
        title.startsWith(`${tq}:`) ||
        title.startsWith(`${tq}(`) ||
        title.startsWith(`${tq}—`) ||
        title.startsWith(`${tq}-`)
      ) {
        s += 120000;
      } else if (title.includes(tq)) {
        s += 60000;
      } else if (titleWords.length > 0) {
        const allWords = titleWords.every((w) => wordBoundaryMatch(title, w));
        if (allWords) {
          s += 15000;
          const titleWordCount = title.split(/\s+/).filter(Boolean).length;
          const extra = Math.max(0, titleWordCount - titleWords.length);
          s -= extra * 2500;
        }
      }
    }

    const langs = Array.isArray(doc.language) ? doc.language : [];
    if (langs.includes('eng')) {
      s += 4500;
    }

    // Prefer a single credited author when the title is an exact match (filters many
    // adaptations/retellings that list a second name in Open Library metadata).
    if (tq.length >= 2 && title === tq && authorNames.length > 1) {
      s -= (authorNames.length - 1) * 7500;
    }

    s += Math.min(doc.edition_count || 0, 400) * 0.3;
    if (doc.cover_i != null) {
      s += 40;
    }

    return s;
  };

  return [...docs].sort((a, b) => scoreDoc(b) - scoreDoc(a));
};

/**
 * Search Open Library by title and/or author.
 * @param {string} title
 * @param {string} author
 * @param {number} maxResults
 */
export const searchBooks = async (title = '', author = '', maxResults = 10) => {
  const trimmedTitle = (title || '').trim();
  const trimmedAuthor = (author || '').trim();

  if (trimmedTitle.length < 2 && trimmedAuthor.length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams();
    const cappedMax = Math.min(Math.max(maxResults, 1), 100);
    const fetchLimit = Math.min(100, Math.max(cappedMax * 3, 25));
    params.set('limit', String(fetchLimit));
    if (trimmedTitle) params.set('title', trimmedTitle);
    if (trimmedAuthor) params.set('author', trimmedAuthor);

    const url = openLibrarySearchUrl(params.toString());
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`);
    }

    const data = await response.json();
    const docs = data.docs;
    if (!Array.isArray(docs) || docs.length === 0) {
      return [];
    }

    const ranked = rankSearchDocs(docs, trimmedTitle, trimmedAuthor);
    return ranked.slice(0, cappedMax).map(parseBookData);
  } catch (error) {
    return [];
  }
};

const debouncedSearchBooksOld = debounce(async (query, callback) => {
  const results = await searchBooks(query, '');
  callback(results);
}, DEBOUNCE_MS);

const debouncedSearchBooksNew = debounce(async (title, author, callback) => {
  const results = await searchBooks(title, author);
  callback(results);
}, DEBOUNCE_MS);

/**
 * Debounced search (750ms). Supports:
 * - (query, callback) — single query string as title
 * - (title, author, callback)
 */
export const debouncedSearchBooks = (titleOrQuery, authorOrCallback, callback) => {
  if (typeof authorOrCallback === 'function') {
    debouncedSearchBooksOld(titleOrQuery, authorOrCallback);
  } else {
    debouncedSearchBooksNew(titleOrQuery, authorOrCallback, callback);
  }
};

/** Normalize work key for API URL (e.g. "/works/OL1W" or "OL1W"). */
const normalizeWorkKey = (workKey) => {
  if (!workKey || typeof workKey !== 'string') return '';
  const trimmed = workKey.trim();
  if (trimmed.startsWith('/works/')) return trimmed;
  if (/^OL\d+W$/i.test(trimmed)) return `/works/${trimmed}`;
  return trimmed.startsWith('/') ? trimmed : `/works/${trimmed}`;
};

/**
 * Load work.json only — full description + subjects (search.json rarely includes description).
 * @param {string} workKey — e.g. "/works/OL45883W"
 */
export const fetchWorkEnrichment = async (workKey) => {
  try {
    const key = normalizeWorkKey(workKey);
    if (!key) return null;

    const url = openLibraryWorkJsonUrl(key);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`);
    }

    const work = await response.json();
    const description =
      typeof work.description === 'string'
        ? work.description
        : work.description?.value || '';
    const subjects = normalizeOlSubjects(work.subjects);

    return {
      description: description.trim(),
      subjects,
      genre: primaryOlGenreFromSubjects(subjects),
    };
  } catch (error) {
    return null;
  }
};

/**
 * Fetch work details by Open Library work key.
 * @param {string} workKey — e.g. "/works/OL45883W"
 */
export const getBookById = async (workKey) => {
  try {
    const key = normalizeWorkKey(workKey);
    if (!key) return null;

    const url = openLibraryWorkJsonUrl(key);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Open Library API error: ${response.status}`);
    }

    const work = await response.json();
    const description =
      typeof work.description === 'string'
        ? work.description
        : work.description?.value || '';

    const authors = [];
    const firstAuthorEntry = Array.isArray(work.authors) ? work.authors[0] : null;
    const firstAuthorKey = firstAuthorEntry?.author?.key;
    if (firstAuthorKey) {
      try {
        const authorUrl = openLibraryAuthorJsonUrl(firstAuthorKey);
        const ar = await fetch(authorUrl);
        if (ar.ok) {
          const aj = await ar.json();
          if (aj.name) authors.push(aj.name);
        }
      } catch {
        // ignore
      }
    }

    const coverId = work.covers?.[0];
    let coverImage = '';
    if (coverId != null) {
      coverImage = `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`;
    }

    const subjects = normalizeOlSubjects(work.subjects);
    const publishDate = work.first_publish_date || work.publish_date || '';

    return {
      id: key,
      title: work.title || '',
      authors,
      author: authors.join(', '),
      description,
      categories: subjects,
      genre: primaryOlGenreFromSubjects(subjects),
      coverImage,
      publishedDate: publishDate,
      pageCount: work.number_of_pages_median ?? null,
      language: 'en',
      publisher: '',
    };
  } catch (error) {
    return null;
  }
};

const openLibraryService = {
  searchBooks,
  debouncedSearchBooks,
  getBookById,
  fetchWorkEnrichment,
};

export default openLibraryService;
