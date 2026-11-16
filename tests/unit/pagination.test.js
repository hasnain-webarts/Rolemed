import { describe, it, expect } from 'vitest';
import { parsePaginationParams, buildPaginationMeta } from '@/lib/pagination';

describe('Standardized Pagination Utility (RM-API-011)', () => {
  describe('parsePaginationParams', () => {
    it('parses valid page and limit parameters correctly', () => {
      const params = new URLSearchParams('page=2&limit=25');
      const { page, limit, skip } = parsePaginationParams(params);
      expect(page).toBe(2);
      expect(limit).toBe(25);
      expect(skip).toBe(25);
    });

    it('defaults gracefully on missing or invalid query values', () => {
      const params = new URLSearchParams('page=-5&limit=abc');
      const { page, limit, skip } = parsePaginationParams(params, 50, 200);
      expect(page).toBe(1);
      expect(limit).toBe(50);
      expect(skip).toBe(0);
    });

    it('clamps limit to maxLimit to protect against runaway memory allocation', () => {
      const params = new URLSearchParams('page=1&limit=5000');
      const { limit } = parsePaginationParams(params, 50, 200);
      expect(limit).toBe(200);
    });
  });

  describe('buildPaginationMeta', () => {
    it('calculates total pages and navigation flags accurately', () => {
      const meta = buildPaginationMeta(95, 2, 20);
      expect(meta.page).toBe(2);
      expect(meta.limit).toBe(20);
      expect(meta.totalPages).toBe(5); // 95 / 20 = 4.75 -> 5
      expect(meta.totalCount).toBe(95);
      expect(meta.hasNextPage).toBe(true);
      expect(meta.hasPrevPage).toBe(true);
    });

    it('handles zero records cleanly without division errors', () => {
      const meta = buildPaginationMeta(0, 1, 50);
      expect(meta.page).toBe(1);
      expect(meta.totalPages).toBe(1);
      expect(meta.totalCount).toBe(0);
      expect(meta.hasNextPage).toBe(false);
      expect(meta.hasPrevPage).toBe(false);
    });
  });
});

