/**
 * Safely escapes characters in user input before passing into RegExp or MongoDB $regex.
 * Prevents ReDoS and syntax crash errors on special characters like [, (, *, +, etc.
 *
 * @param {string} str - Raw user input string
 * @returns {string} - Escaped string safe for regex instantiation
 */
export function escapeRegex(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export default escapeRegex;

