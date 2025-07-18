const API_KEY = '15d2ea6d0dc1d476efbca3eba2b9bbfb';
const BASE_URL = 'https://api.themoviedb.org/3';

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
    const url = new URL(`${BASE_URL}${endpoint}`);
    url.searchParams.append('api_key', API_KEY);
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, value.toString());
      }
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.statusText}`);
    }
    
    return response.json();
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

  async discoverMovies(params: {
    page?: number;
    with_genres?: string;
    year?: string;
    sort_by?: string;
  } = {}): Promise<TMDBResponse<Movie>> {
    const queryParams: Record<string, any> = {
      page: params.page || 1,
      include_adult: true,
      include_video: true,
      language: 'en-US',
    };

    if (params.with_genres) {
      queryParams.with_genres = params.with_genres;
    }

    if (params.year) {
      queryParams.year = params.year;
    }

    if (params.sort_by) {
      queryParams.sort_by = params.sort_by;
    }

    return this.fetchFromTMDB('/discover/movie', queryParams);
  }

  async searchMovies(query: string, page = 1): Promise<TMDBResponse<Movie>> {
    return this.fetchFromTMDB('/search/movie', {
      query,
      page,
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
    return this.fetchFromTMDB(`/movie/${movieId}`, {
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