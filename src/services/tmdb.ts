import { validateSearchQuery, validateId, validateYear, validateSortBy, sanitizeMovieData, RateLimiter } from '@/lib/security';
import { env } from '@/lib/env';

// Use environment variable for API key security
const API_KEY = env.TMDB_API_KEY;
const BASE_URL = 'https://api.themoviedb.org/3';

// Rate limiter to prevent API abuse
const rateLimiter = new RateLimiter(100, 60000);

export interface Movie {
  id: number;
  title: string;
  overview: string;
  poster_path: string;
  backdrop_path: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  adult: boolean;
  original_language: string;
  genre_ids: number[];
}

export interface Genre {
  id: number;
  name: string;
}

export interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

class TMDBService {
  private async fetchFromTMDB<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    // Rate limiting check
    const clientId = 'global'; // In a real app, this could be user-specific
    if (!rateLimiter.isAllowed(clientId)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', API_KEY);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Sanitize movie data if the response contains movie results
    if (data.results && Array.isArray(data.results)) {
      data.results = data.results.map(sanitizeMovieData).filter(Boolean);
    } else if (data.title || data.overview) {
      // Single movie response
      return sanitizeMovieData(data);
    }
    
    return data;
  }

  async getPopularMovies(page = 1): Promise<TMDBResponse<Movie>> {
    return this.fetchFromTMDB('/movie/popular', { page });
  }

  async getTopRatedMovies(page = 1): Promise<TMDBResponse<Movie>> {
    return this.fetchFromTMDB('/movie/top_rated', { page });
  }

  async getLatestMovies(page = 1): Promise<TMDBResponse<Movie>> {
    return this.fetchFromTMDB('/movie/now_playing', { page });
  }

  async getUpcomingMovies(page = 1): Promise<TMDBResponse<Movie>> {
    return this.fetchFromTMDB('/movie/upcoming', { page });
  }

  async discoverMovies(params: {
    page?: number;
    with_genres?: string;
    year?: string;
    sort_by?: string;
    adult_filter?: string;
    with_original_language?: string;
  } = {}): Promise<TMDBResponse<Movie>> {
    // Validate and sanitize input parameters
    const page = Math.max(1, Math.min(1000, parseInt(String(params.page || 1), 10) || 1));
    const validatedYear = validateYear(params.year);
    const validatedSortBy = validateSortBy(params.sort_by);
    
    const queryParams: Record<string, any> = {
      page,
      include_video: true,
      language: 'en-US',
    };

    // Handle adult content filter
    if (params.adult_filter === 'true') {
      // Show only adult content - we'll filter after API call
      queryParams.include_adult = true;
    } else if (params.adult_filter === 'false') {
      // Show only family-friendly content
      queryParams.include_adult = false;
    } else {
      // Show all content
      queryParams.include_adult = true;
    }

    if (params.with_genres && /^\d+(,\d+)*$/.test(params.with_genres)) {
      queryParams.with_genres = params.with_genres;
    }

    if (validatedYear) {
      queryParams.year = validatedYear;
    }

    if (validatedSortBy) {
      queryParams.sort_by = validatedSortBy;
    }

    if (params.with_original_language && /^[a-z]{2}(-[A-Z]{2})?$/.test(params.with_original_language)) {
      queryParams.with_original_language = params.with_original_language;
    }

    const response = await this.fetchFromTMDB<TMDBResponse<Movie>>('/discover/movie', queryParams);
    
    // Filter results for adult-only content if requested
    if (params.adult_filter === 'true') {
      response.results = response.results.filter(movie => movie.adult === true);
    }
    
    return response;
  }

  async getLanguages(): Promise<any[]> {
    return this.fetchFromTMDB('/configuration/languages');
  }

  async searchMovies(query: string, page = 1): Promise<TMDBResponse<Movie>> {
    // Validate and sanitize search query
    const sanitizedQuery = validateSearchQuery(query);
    if (!sanitizedQuery) {
      throw new Error('Invalid search query');
    }
    
    const validPage = Math.max(1, Math.min(1000, parseInt(String(page), 10) || 1));
    
    return this.fetchFromTMDB('/search/movie', {
      query: sanitizedQuery,
      page: validPage,
      include_adult: true,
      language: 'en-US',
    });
  }

  async getGenres(): Promise<{ genres: Genre[] }> {
    return this.fetchFromTMDB('/genre/movie/list', {
      language: 'en-US',
    });
  }

  async getMovieDetails(movieId: number): Promise<Movie> {
    const validId = validateId(movieId);
    if (!validId) {
      throw new Error('Invalid movie ID');
    }
    
    return this.fetchFromTMDB(`/movie/${validId}`, {
      language: 'en-US',
    });
  }

  getImageUrl(path: string, size = 'w500'): string {
    return `https://image.tmdb.org/t/p/${size}${path}`;
  }

  getFullImageUrl(path: string): string {
    return this.getImageUrl(path, 'original');
  }
}

export const tmdbService = new TMDBService();