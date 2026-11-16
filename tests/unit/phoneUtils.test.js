import { describe, it, expect } from 'vitest';
import {
  normalizePhoneForStorage,
  extractPhoneCore,
  matchesPhone,
  buildPhoneSearchRegex,
} from '@/lib/phoneUtils';

describe('Pakistani Phone Utilities (phoneUtils)', () => {
  describe('normalizePhoneForStorage', () => {
    it('normalizes 11-digit 03xxxxxxxxx as-is', () => {
      expect(normalizePhoneForStorage('03001234567')).toBe('03001234567');
    });

    it('removes dashes and spaces from 03xx-xxxxxxx', () => {
      expect(normalizePhoneForStorage('0300-1234567')).toBe('03001234567');
      expect(normalizePhoneForStorage('0321 456 7891')).toBe('03214567891');
    });

    it('adds leading 0 when user types 3xxxxxxxxx (10 digits)', () => {
      expect(normalizePhoneForStorage('3001234567')).toBe('03001234567');
      expect(normalizePhoneForStorage('321-4567891')).toBe('03214567891');
    });

    it('converts +92 3xx format to canonical 03xxxxxxxxx', () => {
      expect(normalizePhoneForStorage('+92 300 2345678')).toBe('03002345678');
      expect(normalizePhoneForStorage('+92 (300) 234-5678')).toBe('03002345678');
      expect(normalizePhoneForStorage('00923002345678')).toBe('03002345678');
    });

    it('handles null, undefined, and non-strings safely', () => {
      expect(normalizePhoneForStorage('')).toBe('');
      expect(normalizePhoneForStorage(null)).toBe('');
      expect(normalizePhoneForStorage(undefined)).toBe('');
    });
  });

  describe('extractPhoneCore', () => {
    it('extracts significant digits from all formats', () => {
      expect(extractPhoneCore('03001234567')).toBe('3001234567');
      expect(extractPhoneCore('3001234567')).toBe('3001234567');
      expect(extractPhoneCore('0300-1234567')).toBe('3001234567');
      expect(extractPhoneCore('+92 (300) 123-4567')).toBe('3001234567');
    });
  });

  describe('matchesPhone (Client-side matching for 03xxxxx and 3xxxxx)', () => {
    const dbPhone1 = '03001234567';
    const dbPhone2 = '0321-9876543';

    it('matches when searching with 03xxxxx format', () => {
      expect(matchesPhone('0300', dbPhone1)).toBe(true);
      expect(matchesPhone('0300123', dbPhone1)).toBe(true);
      expect(matchesPhone('0300-1234567', dbPhone1)).toBe(true);
      expect(matchesPhone('0321', dbPhone2)).toBe(true);
      expect(matchesPhone('0321-987', dbPhone2)).toBe(true);
    });

    it('matches when searching with 3xxxxx format (omitting 0)', () => {
      expect(matchesPhone('300', dbPhone1)).toBe(true);
      expect(matchesPhone('300123', dbPhone1)).toBe(true);
      expect(matchesPhone('300-123', dbPhone1)).toBe(true);
      expect(matchesPhone('321987', dbPhone2)).toBe(true);
      expect(matchesPhone('321-987', dbPhone2)).toBe(true);
    });

    it('does not false-positive on short inputs (< 3 core digits)', () => {
      expect(matchesPhone('0', dbPhone1)).toBe(false);
      expect(matchesPhone('03', dbPhone1)).toBe(false);
      expect(matchesPhone('3', dbPhone1)).toBe(false);
      expect(matchesPhone('30', dbPhone1)).toBe(false);
    });

    it('rejects non-matching numbers', () => {
      expect(matchesPhone('0333', dbPhone1)).toBe(false);
      expect(matchesPhone('333', dbPhone1)).toBe(false);
    });
  });

  describe('buildPhoneSearchRegex (MongoDB backend matching)', () => {
    const testCases = [
      '03001234567',
      '0300-1234567',
      '3001234567',
      '300-1234567',
      '+92 (300) 123-4567',
    ];

    it('matches all database variations when querying with 03xxxxx', () => {
      const regex = buildPhoneSearchRegex('0300123');
      expect(regex).not.toBeNull();
      testCases.forEach((val) => {
        expect(regex.test(val)).toBe(true);
      });
    });

    it('matches all database variations when querying with 3xxxxx', () => {
      const regex = buildPhoneSearchRegex('300123');
      expect(regex).not.toBeNull();
      testCases.forEach((val) => {
        expect(regex.test(val)).toBe(true);
      });
    });

    it('returns null for queries under minimum threshold', () => {
      expect(buildPhoneSearchRegex('03')).toBeNull();
      expect(buildPhoneSearchRegex('3')).toBeNull();
      expect(buildPhoneSearchRegex('')).toBeNull();
    });
  });
});

