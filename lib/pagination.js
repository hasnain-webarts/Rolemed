/**
 * RoleMed RB-HMS Standardized Pagination Utility (RM-API-011)
 * Extracts pagination parameters safely from URL queries and builds standard metadata.
 */

/**
 * Extracts and sanitizes pagination parameters from Request URL searchParams.
 * @param {URLSearchParams} searchParams
 * @param {number} [defaultLimit=50]
 * @param {number} [maxLimit=200]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function parsePaginationParams(searchParams, defaultLimit = 50, maxLimit = 200) {
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10);

  const page = Math.max(1, isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.max(1, Math.min(maxLimit, isNaN(rawLimit) ? defaultLimit : rawLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Constructs standardized pagination metadata response object.
 * @param {number} totalCount
 * @param {number} page
 * @param {number} limit
 * @returns {{ page: number, limit: number, totalPages: number, totalCount: number, hasNextPage: boolean, hasPrevPage: boolean }}
 */
export function buildPaginationMeta(totalCount, page, limit) {
  const total = Math.max(0, parseInt(totalCount, 10) || 0);
  const totalPages = Math.ceil(total / limit) || 1;

  return {
    page,
    limit,
    totalPages,
    totalCount: total,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

