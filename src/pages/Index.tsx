import { useState, useEffect, Suspense, lazy } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { FilterSection } from '@/components/FilterSection';
import { MovieCategoryCard } from '@/components/MovieCategoryCard';
import { SecurityNotice } from '@/components/SecurityNotice';
import { tmdbService, Movie, Genre } from '@/services/tmdb';
import { useToast } from '@/hooks/use-toast';
import { handleSecureError } from '@/lib/error-handler';

// Lazy load components that are only used on user interaction
const MovieModal = lazy(() => import('@/components/MovieModal').then(m => ({ default: m.MovieModal })));
const VideoPlayer = lazy(() => import('@/components/VideoPlayer').then(m => ({ default: m.VideoPlayer })));

const Index = () => {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [playingMovie, setPlayingMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  
  // Filters
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popularity.desc');
  const [selectedAdult, setSelectedAdult] = useState('false');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  
  const { toast } = useToast();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load movies when filters change
  useEffect(() => {
    setCurrentPage(1);
    setMovies([]);
    loadMovies(1);
  }, [selectedGenre, selectedYear, selectedSort, selectedAdult, selectedLanguage]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [genresResponse, languagesResponse, moviesResponse] = await Promise.all([
        tmdbService.getGenres(),
        tmdbService.getLanguages(),
        tmdbService.discoverMovies({
          sort_by: selectedSort,
          adult_filter: 'false'
        })
      ]);

      setGenres(genresResponse.genres);
      setLanguages(languagesResponse);
      setMovies(moviesResponse.results);
      setTotalPages(moviesResponse.total_pages);
      setFeaturedMovie(moviesResponse.results[0]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      const errorMessage = handleSecureError(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMovies = async (page = 1, append = false) => {
    try {
      setLoading(true);
      const response = await tmdbService.discoverMovies({
        page,
        with_genres: selectedGenre === 'all' ? '' : selectedGenre,
        year: selectedYear === 'all' ? '' : selectedYear,
        sort_by: selectedSort,
        adult_filter: selectedAdult === 'all' ? '' : selectedAdult,
        with_original_language: selectedLanguage === 'all' ? '' : selectedLanguage,
      });

      if (append) {
        setMovies(prev => [...prev, ...response.results]);
      } else {
        setMovies(response.results);
        setFeaturedMovie(response.results[0]);
      }
      
      setTotalPages(response.total_pages);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading movies:', error);
      const errorMessage = handleSecureError(error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await tmdbService.searchMovies(query);
      setSearchResults(response.results);
    } catch (error) {
      console.error('Error searching movies:', error);
      const errorMessage = handleSecureError(error);
      toast({
        title: "Search Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleMovieClick = (movie: Movie) => {
    setSelectedMovie(movie);
  };

  const handlePlayMovie = (movie: Movie) => {
    setPlayingMovie(movie);
    setSelectedMovie(null);
  };

  const handleLoadMore = () => {
    if (currentPage < totalPages) {
      loadMovies(currentPage + 1, true);
    }
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
  };

  const handleClosePlayer = () => {
    setPlayingMovie(null);
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <Navbar
        onSearch={handleSearch}
        searchResults={searchResults}
        onSelectMovie={handleMovieClick}
      />

      {/* Hero Section */}
      {featuredMovie && (
        <HeroSection
          movie={featuredMovie}
          onPlayMovie={handlePlayMovie}
          onShowDetails={handleMovieClick}
        />
      )}

      {/* Filters */}
      <FilterSection
        genres={genres}
        languages={languages}
        selectedGenre={selectedGenre}
        selectedYear={selectedYear}
        selectedSort={selectedSort}
        selectedAdult={selectedAdult}
        selectedLanguage={selectedLanguage}
        onGenreChange={setSelectedGenre}
        onYearChange={setSelectedYear}
        onSortChange={setSelectedSort}
        onAdultChange={setSelectedAdult}
        onLanguageChange={setSelectedLanguage}
      />

      {/* Security Notice */}
      <div className="container mx-auto px-4 py-2">
        <SecurityNotice />
      </div>

      {/* Movie Categories */}
      <div className="container mx-auto px-4 py-8 space-y-8">
        <MovieCategoryCard
          title="Trending Movies"
          category="popular"
          selectedGenre={selectedGenre}
          selectedYear={selectedYear}
          selectedSort={selectedSort}
          selectedAdult={selectedAdult}
          selectedLanguage={selectedLanguage}
          onMovieClick={handleMovieClick}
          onPlayMovie={handlePlayMovie}
        />
        
        <MovieCategoryCard
          title="Top Rated Movies"
          category="top_rated"
          selectedGenre={selectedGenre}
          selectedYear={selectedYear}
          selectedSort={selectedSort}
          selectedAdult={selectedAdult}
          selectedLanguage={selectedLanguage}
          onMovieClick={handleMovieClick}
          onPlayMovie={handlePlayMovie}
        />
        
        <MovieCategoryCard
          title="Latest Releases"
          category="latest"
          selectedGenre={selectedGenre}
          selectedYear={selectedYear}
          selectedSort={selectedSort}
          selectedAdult={selectedAdult}
          selectedLanguage={selectedLanguage}
          onMovieClick={handleMovieClick}
          onPlayMovie={handlePlayMovie}
        />
        
        <MovieCategoryCard
          title="Upcoming Movies"
          category="upcoming"
          selectedGenre={selectedGenre}
          selectedYear={selectedYear}
          selectedSort={selectedSort}
          selectedAdult={selectedAdult}
          selectedLanguage={selectedLanguage}
          onMovieClick={handleMovieClick}
          onPlayMovie={handlePlayMovie}
        />
      </div>

      {/* Movie Details Modal */}
      <Suspense fallback={null}>
        <MovieModal
          movie={selectedMovie}
          isOpen={!!selectedMovie}
          onClose={handleCloseModal}
          onPlay={handlePlayMovie}
        />
      </Suspense>

      {/* Video Player */}
      <Suspense fallback={null}>
        <VideoPlayer
          movieId={playingMovie?.id || 0}
          movieTitle={playingMovie?.title || ''}
          isOpen={!!playingMovie}
          onClose={handleClosePlayer}
        />
      </Suspense>
    </div>
  );
};

export default Index;
