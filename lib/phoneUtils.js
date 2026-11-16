/**
 * Pakistani Phone Number Normalization & Search Utilities
 *
 * Requirements:
 * - Operates strictly in Pakistani context (no +92 needed).
 * - Stores phone numbers in DB in canonical 03xxxxxxxxx format (e.g. 03001234567).
 * - Matches searches on both 03xxxxx and 3xxxxx (with or without dashes, spaces, or country code).
 */

/**
 * Normalizes any phone input to standard Pakistani 03xxxxxxxxx format for database storage.
 * @param {string} raw - Raw input phone number (e.g. "0300-1234567", "3001234567", "+92 300 1234567")
 * @returns {string} - Clean phone string starting with 03 (e.g. "03001234567")
 */
export function normalizePhoneForStorage(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Handle international prefix 0092 or 92
  if (digits.startsWith('0092')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('92') && digits.length >= 11) {
    digits = digits.slice(2);
  }

  // Ensure standard Pakistani local format starts with 0
  if (!digits.startsWith('0')) {
    digits = '0' + digits;
  }

  return digits;
}

/**
 * Extracts the core significant digits for a Pakistani phone number (without country code or leading 0).
 * E.g. "0300-1234567" -> "3001234567", "3001234567" -> "3001234567", "+92 300 1234567" -> "3001234567".
 * @param {string} raw
 * @returns {string}
 */
export function extractPhoneCore(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

/**
 * Checks whether a user search input matches a target phone number in client-side arrays.
 * Supports matching both "03xxxxx" and "3xxxxx", with or without hyphens or spaces.
 * @param {string} searchInput - What the user typed (e.g. "0300", "300", "0300-1234567", "3001234567")
 * @param {string} targetPhone - Stored phone number (e.g. "03001234567", "0300-1234567")
 * @param {number} minDigits - Minimum core digits required to trigger match (default: 3)
 * @returns {boolean}
 */
export function matchesPhone(searchInput, targetPhone, minDigits = 3) {
  if (!searchInput || !targetPhone) return false;
  const inputCore = extractPhoneCore(searchInput);
  if (inputCore.length < minDigits) return false;

  const targetCore = extractPhoneCore(targetPhone);
  return targetCore.includes(inputCore);
}

/**
 * Builds a MongoDB-safe regex that matches phone numbers in the database
 * regardless of whether the query was typed as 03xxxxx or 3xxxxx,
 * and regardless of punctuation (dashes, spaces, parentheses).
 * @param {string} searchInput
 * @param {number} minDigits - Minimum core digits required (default: 3)
 * @returns {RegExp|null}
 */
export function buildPhoneSearchRegex(searchInput, minDigits = 3) {
  if (!searchInput || typeof searchInput !== 'string') return null;
  const core = extractPhoneCore(searchInput);
  if (core.length < minDigits) return null;

  // Interleave with [^0-9]* so dashes, spaces, and punctuation in stored numbers match
  const corePattern = core.split('').join('[^0-9]*');
  // Allow optional leading country code (+92 / 92) or local trunk 0
  return new RegExp('(?:\\+?92|0)?[^0-9]*' + corePattern, 'i');
}

