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

const openLibraryWorkEditionsUrl = (workKeyNormalized, limit) => {
  const lim = Math.min(100, Math.max(1, limit || 50));
  if (isNativeApp()) {
    return `${getApiBase()}/v1/open-library/work-editions?key=${encodeURIComponent(workKeyNormalized)}&limit=${lim}`;
  }
  return `${OPEN_LIBRARY_ORIGIN}${workKeyNormalized}/editions.json?limit=${lim}`;
};

const openLibraryEditionJsonUrl = (editionKeyNormalized) => {
  if (isNativeApp()) {
    return `${getApiBase()}/v1/open-library/edition?key=${encodeURIComponent(editionKeyNormalized)}`;
  }
  return `${OPEN_LIBRARY_ORIGIN}${editionKeyNormalized}.json`;
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
 * Open Library cover sizes (see https://openlibrary.org/dev/docs/api/covers).
 * Use L for stored / hero display; M or S for dense lists and autocomplete.
 */
export const OL_COVER_SIZE = Object.freeze({
  S: 'S',
  M: 'M',
  L: 'L',
});

/**
 * Rewrite covers.openlibrary.org `b/id` or `b/isbn` URLs to another size suffix.
 * Non-OL URLs are returned unchanged.
 * @param {string} url
 * @param {'S'|'M'|'L'} [size='L']
 */
export const setOpenLibraryCoverSize = (url, size = OL_COVER_SIZE.L) => {
  if (!url || typeof url !== 'string') return url;
  const suf =
    size === OL_COVER_SIZE.S || size === OL_COVER_SIZE.M || size === OL_COVER_SIZE.L
      ? size
      : OL_COVER_SIZE.L;
  return url.replace(
      /^(https:\/\/covers\.openlibrary\.org\/b\/(?:id|isbn)\/.+)-[SML]\.jpg$/i,
      (_, base) => `${base}-${suf}.jpg`,
  );
};

/**
 * Build cover image URL from Open Library search/work fields.
 * `cover_i` is whichever edition OL attached to the work — it may be a translation’s jacket.
 * @param {object} doc
 * @param {'S'|'M'|'L'} [size=OL_COVER_SIZE.L] — default large for persisted club books / detail views
 */
const buildCoverImageUrl = (doc, size = OL_COVER_SIZE.L) => {
  if (doc.cover_i != null && doc.cover_i !== '') {
    return `https://covers.openlibrary.org/b/id/${doc.cover_i}-${size}.jpg`;
  }
  const isbns = doc.isbn;
  if (Array.isArray(isbns) && isbns.length > 0) {
    const isbn = String(isbns[0]).replace(/-/g, '');
    if (isbn) {
      return `https://covers.openlibrary.org/b/isbn/${isbn}-${size}.jpg`;
    }
  }
  return '';
};

/** Map Open Library /languages/* codes to a short display label. */
const OL_LANGUAGE_CODE_TO_LABEL = {
  eng: 'English',
  en: 'English',
  fre: 'French',
  spa: 'Spanish',
  ger: 'German',
  deu: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  jpn: 'Japanese',
  zho: 'Chinese',
  chi: 'Chinese',
  rus: 'Russian',
  tur: 'Turkish',
  fin: 'Finnish',
  dut: 'Dutch',
  pol: 'Polish',
  swe: 'Swedish',
  nor: 'Norwegian',
  dan: 'Danish',
  gre: 'Greek',
  ara: 'Arabic',
  heb: 'Hebrew',
  hin: 'Hindi',
  kor: 'Korean',
};

export const olLanguageCodeToLabel = (code) => {
  if (!code || typeof code !== 'string') return '';
  const c = code.toLowerCase().trim();
  return OL_LANGUAGE_CODE_TO_LABEL[c] || c.toUpperCase();
};

const pickOlEditionLanguageCode = (entry) => {
  const langs = entry.languages;
  if (Array.isArray(langs) && langs.length > 0) {
    const first = langs[0];
    const key = typeof first === 'string' ? first : first?.key;
    if (typeof key === 'string') {
      const m = key.match(/\/languages\/([a-z]{2,3})/i);
      if (m) return m[1].toLowerCase();
    }
  }
  if (typeof entry.language === 'string') {
    const m = entry.language.match(/([a-z]{2,3})/i);
    if (m) return m[1].toLowerCase();
  }
  return '';
};

const pickOlEditionYear = (entry) => {
  const raw = entry.publish_date || entry.first_publish_date || '';
  if (!raw) return '';
  const s = String(raw);
  const ym = s.match(/\b(19|20)\d{2}\b/);
  return ym ? ym[0] : '';
};

/**
 * Dedupe by cover URL; first edition wins per cover.
 * @param {object[]} entries — `entries` from Open Library `.../editions.json`
 * @returns {{ coverImage: string, editionKey: string, editionTitle: string, editionDetail: string, languageLabel: string, year: string }[]}
 */
export const buildEditionCoverOptionsFromEntries = (entries) => {
  if (!Array.isArray(entries)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of entries) {
    const coverId = Array.isArray(entry.covers) && entry.covers.length > 0 ? entry.covers[0] : null;
    if (coverId == null || coverId === '' || coverId < 0) continue;
    // Medium thumbs in the picker grid; parent saves `-L` when an edition is chosen.
    const url = `https://covers.openlibrary.org/b/id/${coverId}-${OL_COVER_SIZE.M}.jpg`;
    if (seen.has(url)) continue;
    seen.add(url);
    const editionKey = typeof entry.key === 'string' ? entry.key.trim() : '';
    if (!editionKey.startsWith('/books/')) continue;

    const title = (entry.title || '').trim();
    const subtitle = (entry.subtitle || '').trim();
    const editionTitle = [title, subtitle].filter(Boolean).join(' — ') || 'Edition';
    const editionDetail =
      (entry.edition_name && String(entry.edition_name).trim()) ||
      (entry.physical_format && String(entry.physical_format).trim()) ||
      '';
    const langCode = pickOlEditionLanguageCode(entry);
    const languageLabel = olLanguageCodeToLabel(langCode);
    const year = pickOlEditionYear(entry);

    out.push({
      coverImage: url,
      editionKey,
      editionTitle,
      editionDetail,
      languageLabel,
      year,
    });
  }
  return out;
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

/** True if any subject uses Open Library's genre: namespace (authoritative for our genre field). */
export const olSubjectsIncludeGenreTag = (rawSubjects) =>
  normalizeOlSubjects(rawSubjects).some((s) => /^genre:\s*\S/i.test(s));

/**
 * Display label for OL-sourced genre: trim, collapse whitespace, title-case each word (space- or hyphen-separated).
 */
export const normalizeOlGenreDisplayLabel = (raw) => {
  const s = String(raw || '')
      .trim()
      .replace(/\s+/g, ' ');
  if (!s) return '';
  return s
      .split(/[\s-]+/)
      .filter(Boolean)
      .map(
          (w) =>
            w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(),
      )
      .join(' ');
};

const PLAIN_SUBJECT_NOISE =
  /englisch|espa[nñ]ol|fran[cç]ais|deutsch|italiano|juvenil|pour la jeunesse|nouvelles,\s*etc|amerikanisches/i;

const pickPlainOlGenreSubject = (list) => {
  const plains = list.filter(
      (s) =>
        s &&
        !/^genre:\s*/i.test(s) &&
        !/^form:\s*/i.test(s) &&
        !/^(franchise|series):/i.test(s) &&
        !/^(place|time|person|event):/i.test(s) &&
        s.length <= 120 &&
        !PLAIN_SUBJECT_NOISE.test(s),
  );
  if (plains.length === 0) return '';

  const specificWord =
    /\b(fantasy|dystopia|dystopian|romance|thriller|mystery|horror|adventure|biography|memoir|history|science\b|philosophy|poetry|young adult)\b/i;

  for (const p of plains) {
    if (/^fiction$/i.test(p.trim())) continue;
    return p;
  }
  const hit = plains.find((p) => specificWord.test(p));
  if (hit) return hit;
  return plains[0];
};

/**
 * Best Open Library–derived genre string for the form: prefer genre:, then a plain subject, then form:.
 * Values are normalized for display (e.g. science fiction → Science Fiction).
 */
export const primaryOlGenreFromSubjects = (subjects) => {
  const list = normalizeOlSubjects(subjects);

  for (const s of list) {
    const gm = s.match(/^genre:\s*(.+)$/i);
    if (gm) {
      const inner = gm[1].trim();
      if (inner) return normalizeOlGenreDisplayLabel(inner);
    }
  }

  const plain = pickPlainOlGenreSubject(list);
  if (plain) return normalizeOlGenreDisplayLabel(plain);

  for (const s of list) {
    const fm = s.match(/^form:\s*(.+)$/i);
    if (fm) {
      const inner = fm[1].trim();
      if (inner) return normalizeOlGenreDisplayLabel(inner);
    }
  }

  return '';
};

/** Re-order subjects so theme heuristics see genre/plain terms before franchise/series noise. */
const orderOlSubjectsForThemeInference = (rawSubjects) => {
  const list = normalizeOlSubjects(rawSubjects);
  const head = [];
  const mid = [];
  const tail = [];
  for (const s of list) {
    if (/^genre:\s*/i.test(s) || /^form:\s*/i.test(s)) head.push(s);
    else if (/^(franchise|series):/i.test(s)) tail.push(s);
    else mid.push(s);
  }
  return [...head, ...mid, ...tail];
};

/**
 * Map Open Library subjects to club genre presets when there is no genre: subject.
 * Returns null if no confident match (caller keeps primaryOlGenreFromSubjects / prior value).
 */
export const mapOlSubjectsToGenrePreset = (rawSubjects) => {
  if (olSubjectsIncludeGenreTag(rawSubjects)) return null;
  const subjects = normalizeOlSubjects(rawSubjects);
  if (subjects.length === 0) return null;
  const text = subjects.slice(0, 20).join(' | ').toLowerCase();

  const rules = [
    [
      /(meditation|mindfulness|spiritual|spirituality|buddhis|taoism|religion|theology|prayer\b|sacred\b)/,
      'Mindfulness & Spirituality',
    ],
    [
      /(philosophy|stoic|stoicism|ethics|existential|bildungsroman)/,
      'Philosophy & Resilience',
    ],
    [
      /(psychology|cognitive|behavioral science|neuroscience|decision making)/,
      'Psychology & Decision Making',
    ],
    [
      /(leadership|productivity|time management|habits?\b|discipline\b|executive coach)/,
      'Leadership & Productivity',
    ],
    [
      /(self[- ]?help|personal development|self[- ]?improvement|motivation\b)/,
      'Personal Development',
    ],
    [
      /(business|entrepreneur|startup|marketing|economics|finance\b|investing)/,
      'Business & Entrepreneurship',
    ],
    [
      /(health|wellness|nutrition|fitness|medicine|diet\b|longevity)/,
      'Health & Wellness',
    ],
    [
      /(relationship|marriage|parenting|communication skills|interpersonal)/,
      'Relationships & Communication',
    ],
    [
      /(creativity|innovation|design thinking|art\b|music\b|film\b)/,
      'Creativity & Innovation',
    ],
    [
      /(history|biography|memoir|war\b|ancient|medieval|civil war)/,
      'History & Biography',
    ],
    [
      /(science\b|technology|physics|mathematics|astronomy|engineering|computer)/,
      'Science & Technology',
    ],
    [
      /(education|textbook|reference|encyclopedia|study skills)/,
      'Education & Reference',
    ],
    [
      /(fiction|novel|fantasy|romance|science fiction|sci-fi|poetry|literary|dystopia|young adult)/,
      'Literature & Fiction',
    ],
  ];

  for (const [re, preset] of rules) {
    if (re.test(text)) return preset;
  }

  return null;
};

/**
 * Genre string for the add-book form: OL genre: wins (normalized); otherwise preset map, else primary OL string.
 */
export const resolveOlGenreForBookForm = (rawSubjects, searchParsedGenre) => {
  const list = normalizeOlSubjects(rawSubjects);
  const hasTag = olSubjectsIncludeGenreTag(list);
  const primary = primaryOlGenreFromSubjects(list);
  if (hasTag) return (searchParsedGenre || primary).trim();
  const preset = mapOlSubjectsToGenrePreset(list);
  const merged = (preset ?? searchParsedGenre ?? primary).trim();
  return merged;
};

/**
 * Map Open Library subjects to Classy / Creative / Curious when the club uses the default trio.
 */
export const mapOlSubjectsToDefaultClubThemes = (rawSubjects) => {
  const subjects = orderOlSubjectsForThemeInference(rawSubjects);
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
 * Edition cover options for a work (cover picker carousel).
 * @param {string} workKey
 * @param {number} [limit=50]
 */
export const fetchWorkEditionCovers = async (workKey, limit = 15) => {
  try {
    const key = normalizeWorkKey(workKey);
    if (!key) return [];

    const url = openLibraryWorkEditionsUrl(key, limit);
    const response = await fetch(url);
    if (!response.ok) return [];
    const data = await response.json();
    return buildEditionCoverOptionsFromEntries(data.entries);
  } catch {
    return [];
  }
};

/**
 * Description + subjects for an edition; fills gaps from work JSON when sparse.
 * @param {string} editionKey — e.g. /books/OL123M
 * @param {string|null|undefined} workFallbackKey — Open Library work key for this club book
 */
export const fetchEditionEnrichment = async (editionKey, workFallbackKey = null) => {
  try {
    const raw = (editionKey || '').trim();
    if (!raw.startsWith('/books/')) return null;

    const url = openLibraryEditionJsonUrl(raw);
    const response = await fetch(url);
    if (!response.ok) return null;
    const edition = await response.json();

    const descRaw = edition.description;
    let description =
      typeof descRaw === 'string'
        ? descRaw.trim()
        : typeof descRaw?.value === 'string'
          ? descRaw.value.trim()
          : '';

    let subjects = normalizeOlSubjects(edition.subjects);

    const workKey =
      normalizeWorkKey(workFallbackKey) ||
      (typeof edition.works?.[0]?.key === 'string' ? edition.works[0].key.trim() : '');
    if (workKey && (!description || subjects.length === 0)) {
      const workEnr = await fetchWorkEnrichment(workKey);
      if (workEnr) {
        if (!description && workEnr.description) {
          description = workEnr.description;
        }
        if (subjects.length === 0 && workEnr.subjects?.length) {
          subjects = [...workEnr.subjects];
        }
      }
    }

    return {
      description: description.trim(),
      subjects,
      genre: primaryOlGenreFromSubjects(subjects),
    };
  } catch {
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
      coverImage = `https://covers.openlibrary.org/b/id/${coverId}-${OL_COVER_SIZE.L}.jpg`;
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
  fetchWorkEditionCovers,
  fetchEditionEnrichment,
  buildEditionCoverOptionsFromEntries,
  olLanguageCodeToLabel,
  setOpenLibraryCoverSize,
  OL_COVER_SIZE,
};

export default openLibraryService;
