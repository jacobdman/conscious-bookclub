import {
  primaryOlGenreFromSubjects,
  olSubjectsIncludeGenreTag,
  mapOlSubjectsToGenrePreset,
  resolveOlGenreForBookForm,
  normalizeOlGenreDisplayLabel,
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
