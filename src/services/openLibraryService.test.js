import {
  primaryOlGenreFromSubjects,
  olSubjectsIncludeGenreTag,
  mapOlSubjectsToGenrePreset,
  resolveOlGenreForBookForm,
  normalizeOlGenreDisplayLabel,
  buildEditionCoverOptionsFromEntries,
  olLanguageCodeToLabel,
  setOpenLibraryCoverSize,
  OL_COVER_SIZE,
} from './openLibraryService';

const RED_RISING_SUBJECTS = [
  'franchise:Red Rising',
  'series:Red Rising Trilogy',
  'series:Red Rising Saga',
  'form:novel',
  'genre:science fiction',
  'Fantasy',
  'Fiction',
  'Dystopia',
  'Young Adult',
  'Resistance to Government',
  'Amerikanisches Englisch',
  'Social classes',
  'Adventure',
];

describe('openLibraryService OL genre', () => {
  describe('normalizeOlGenreDisplayLabel', () => {
    it('title-cases words (spaces and hyphens)', () => {
      expect(normalizeOlGenreDisplayLabel('science fiction')).toBe(
        'Science Fiction',
      );
      expect(normalizeOlGenreDisplayLabel('science-fiction')).toBe(
        'Science Fiction',
      );
      expect(normalizeOlGenreDisplayLabel('SCIENCE FICTION')).toBe(
        'Science Fiction',
      );
    });
  });

  describe('primaryOlGenreFromSubjects', () => {
    it('uses genre: not franchise or subjects[0]', () => {
      expect(primaryOlGenreFromSubjects(RED_RISING_SUBJECTS)).toBe(
        'Science Fiction',
      );
    });

    it('falls back to form: when no genre or plain', () => {
      expect(
        primaryOlGenreFromSubjects(['series:Foo', 'form:novella']),
      ).toBe('Novella');
    });

    it('picks first meaningful plain subject when no genre:', () => {
      expect(
        primaryOlGenreFromSubjects(['series:X', 'Biography', 'Fiction']),
      ).toBe('Biography');
    });
  });

  describe('olSubjectsIncludeGenreTag', () => {
    it('is true when genre: present', () => {
      expect(olSubjectsIncludeGenreTag(RED_RISING_SUBJECTS)).toBe(true);
    });
    it('is false without genre:', () => {
      expect(olSubjectsIncludeGenreTag(['Fantasy', 'Fiction'])).toBe(false);
    });
  });

  describe('mapOlSubjectsToGenrePreset', () => {
    it('returns null when genre: exists (never override OL genre)', () => {
      expect(mapOlSubjectsToGenrePreset(RED_RISING_SUBJECTS)).toBe(null);
    });

    it('maps plain subjects when no genre: tag', () => {
      expect(
        mapOlSubjectsToGenrePreset(['World War 2', 'Military history']),
      ).toBe('History & Biography');
    });

    it('returns null when no rule matches', () => {
      expect(mapOlSubjectsToGenrePreset(['Widgets', 'Gadgets'])).toBe(null);
    });
  });

  describe('resolveOlGenreForBookForm', () => {
    it('keeps normalized OL genre when genre: present, not preset', () => {
      const parsed = primaryOlGenreFromSubjects(RED_RISING_SUBJECTS);
      expect(resolveOlGenreForBookForm(RED_RISING_SUBJECTS, parsed)).toBe(
        'Science Fiction',
      );
      expect(resolveOlGenreForBookForm(RED_RISING_SUBJECTS, '')).toBe(
        'Science Fiction',
      );
    });

    it('uses preset when no genre: tag', () => {
      const subs = ['World War 2', 'Battles'];
      const parsed = primaryOlGenreFromSubjects(subs);
      expect(resolveOlGenreForBookForm(subs, parsed)).toBe(
        'History & Biography',
      );
    });
  });
});

describe('olLanguageCodeToLabel', () => {
  it('maps common codes and uppercases unknown', () => {
    expect(olLanguageCodeToLabel('eng')).toBe('English');
    expect(olLanguageCodeToLabel('fre')).toBe('French');
    expect(olLanguageCodeToLabel('xyz')).toBe('XYZ');
  });
});

describe('setOpenLibraryCoverSize', () => {
  it('rewrites id and isbn cover URLs between S, M, L', () => {
    const idM = 'https://covers.openlibrary.org/b/id/9255566-M.jpg';
    expect(setOpenLibraryCoverSize(idM, OL_COVER_SIZE.L)).toBe(
      'https://covers.openlibrary.org/b/id/9255566-L.jpg',
    );
    const isbnL = 'https://covers.openlibrary.org/b/isbn/9781234567890-L.jpg';
    expect(setOpenLibraryCoverSize(isbnL, OL_COVER_SIZE.S)).toBe(
      'https://covers.openlibrary.org/b/isbn/9781234567890-S.jpg',
    );
  });

  it('leaves non-Open-Library URLs unchanged', () => {
    const u = 'https://example.com/cover.jpg';
    expect(setOpenLibraryCoverSize(u, OL_COVER_SIZE.M)).toBe(u);
  });
});

describe('buildEditionCoverOptionsFromEntries', () => {
  it('maps covers and edition keys', () => {
    const entries = [
      { key: '/books/OL1M', covers: [111, 222] },
      { key: '/books/OL2M', covers: [333] },
    ];
    const out = buildEditionCoverOptionsFromEntries(entries);
    expect(out).toEqual([
      {
        coverImage: 'https://covers.openlibrary.org/b/id/111-M.jpg',
        editionKey: '/books/OL1M',
        editionTitle: 'Edition',
        editionDetail: '',
        languageLabel: '',
        year: '',
      },
      {
        coverImage: 'https://covers.openlibrary.org/b/id/333-M.jpg',
        editionKey: '/books/OL2M',
        editionTitle: 'Edition',
        editionDetail: '',
        languageLabel: '',
        year: '',
      },
    ]);
  });

  it('includes title, format, language, and year when present', () => {
    const entries = [
      {
        key: '/books/OL1M',
        covers: [111],
        title: 'Project Hail Mary',
        subtitle: 'Bonus',
        physical_format: 'Hardcover',
        languages: [{ key: '/languages/eng' }],
        publish_date: '2021-05-04',
      },
    ];
    const out = buildEditionCoverOptionsFromEntries(entries);
    expect(out[0]).toMatchObject({
      editionTitle: 'Project Hail Mary — Bonus',
      editionDetail: 'Hardcover',
      languageLabel: 'English',
      year: '2021',
    });
  });

  it('prefers edition_name over physical_format for detail line', () => {
    const out = buildEditionCoverOptionsFromEntries([
      {
        key: '/books/OL1M',
        covers: [1],
        title: 'T',
        edition_name: '2nd ed.',
        physical_format: 'Paperback',
      },
    ]);
    expect(out[0].editionDetail).toBe('2nd ed.');
  });

  it('skips invalid cover ids', () => {
    expect(
      buildEditionCoverOptionsFromEntries([
        { key: '/books/OL1M', covers: [-1] },
      ]),
    ).toEqual([]);
  });

  it('dedupes identical cover URLs (first edition wins)', () => {
    const entries = [
      { key: '/books/OL1M', covers: [999] },
      { key: '/books/OL2M', covers: [999] },
    ];
    const out = buildEditionCoverOptionsFromEntries(entries);
    expect(out).toHaveLength(1);
    expect(out[0].editionKey).toBe('/books/OL1M');
  });

  it('skips entries without covers or valid book keys', () => {
    const entries = [
      { key: '/books/OL1M' },
      { key: '/invalid/x', covers: [1] },
      { covers: [2] },
    ];
    expect(buildEditionCoverOptionsFromEntries(entries)).toEqual([]);
  });

  it('returns empty for non-array', () => {
    expect(buildEditionCoverOptionsFromEntries(null)).toEqual([]);
    expect(buildEditionCoverOptionsFromEntries(undefined)).toEqual([]);
  });
});
