import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
}

/**
 * Validates and sanitizes search queries
 */
export function validateSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous characters
  const sanitized = query.replace(/[<>\"'&]/g, '').trim();
  
  // Limit length to prevent abuse
  return sanitized.slice(0, 100);
}

/**
 * Validates numeric IDs to prevent injection
 */
export function validateId(id: any): number | null {
  const parsed = parseInt(id, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > Number.MAX_SAFE_INTEGER) {
    return null;
  }
  return parsed;
}

/**
 * Validates year parameter
 */
export function validateYear(year: any): string | null {
  if (!year) return null;
  
  const yearNum = parseInt(year, 10);
  const currentYear = new Date().getFullYear();
  
  if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 5) {
    return null;
  }
  
  return yearNum.toString();
}

/**
 * Validates sort_by parameter against allowed values
 */
export function validateSortBy(sortBy: any): string | null {
  const allowedSorts = [
    'popularity.desc',
    'popularity.asc',
    'release_date.desc',
    'release_date.asc',
    'vote_average.desc',
    'vote_average.asc',
    'vote_count.desc',
    'vote_count.asc',
  ];
  
  if (!sortBy || !allowedSorts.includes(sortBy)) {
    return null;
  }
  
  return sortBy;
}

/**
 * Sanitizes movie data from TMDB API
 */
export function sanitizeMovieData(movie: any): any {
  if (!movie || typeof movie !== 'object') {
    return null;
  }

  return {
    ...movie,
    title: sanitizeHtml(movie.title || ''),
    overview: sanitizeHtml(movie.overview || ''),
    original_title: sanitizeHtml(movie.original_title || ''),
  };
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 100, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];
    
    // Remove old requests outside the window
    const validRequests = requests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    return true;
  }
}