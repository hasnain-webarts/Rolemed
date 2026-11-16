import { describe, it, expect } from 'vitest';
import { escapeRegex } from '@/lib/escapeRegex';

describe('escapeRegex ReDoS & Regex Sanitization', () => {
  it('escapes standard regex metacharacters correctly', () => {
    const raw = 'John.Doe (Specialist) [Cardiology] +more * {test}? ^$ | \\';
    const escaped = escapeRegex(raw);

    // Ensure none of the metacharacters remain unescaped
    expect(escaped).toBe(
      'John\\.Doe \\(Specialist\\) \\[Cardiology\\] \\+more \\* \\{test\\}\\? \\^\\$ \\| \\\\'
    );
  });

  it('safely instantiates RegExp without throwing syntax errors', () => {
    const dangerousInputs = [
      '(([a-z]+)+)+',
      '[[[[[[[[[[',
      '??????????',
      '++++++++++',
      '**********',
      '(?<=abc)',
      '\\u0000',
    ];

    for (const input of dangerousInputs) {
      const escaped = escapeRegex(input);
      expect(() => new RegExp(escaped, 'i')).not.toThrow();
    }
  });

  it('matches literal string targets correctly when passed to RegExp', () => {
    const pattern = '(VIP)';
    const regex = new RegExp(escapeRegex(pattern), 'i');

    expect(regex.test('Patient is (VIP) priority')).toBe(true);
    expect(regex.test('Patient is VIP priority')).toBe(false);
  });

  it('handles null, undefined, empty string, and non-string inputs safely', () => {
    expect(escapeRegex('')).toBe('');
    expect(escapeRegex(null)).toBe('');
    expect(escapeRegex(undefined)).toBe('');
    expect(escapeRegex(123)).toBe('');
    expect(escapeRegex({})).toBe('');
  });
});

