import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { FilterSection } from '@/components/FilterSection';
import { MovieGrid } from '@/components/MovieGrid';
import { MovieModal } from '@/components/MovieModal';
import { VideoPlayer } from '@/components/VideoPlayer';
import { tmdbService, Movie, Genre } from '@/services/tmdb';
import { useToast } from '@/hooks/use-toast';

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
  const [selectedAdult, setSelectedAdult] = useState('all');
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
        tmdbService.discoverMovies({ sort_by: selectedSort })
      ]);

      setGenres(genresResponse.genres);
      setLanguages(languagesResponse);
      setMovies(moviesResponse.results);
      setTotalPages(moviesResponse.total_pages);
      setFeaturedMovie(moviesResponse.results[0]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast({
        title: "Error",
        description: "Failed to load movies. Please try again.",
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
        include_adult: selectedAdult === 'all' ? '' : selectedAdult,
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
      toast({
        title: "Error",
        description: "Failed to load movies. Please try again.",
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

      {/* Movies Grid */}
      <MovieGrid
        movies={movies}
        onMovieClick={handleMovieClick}
        onLoadMore={handleLoadMore}
        hasMore={currentPage < totalPages}
        loading={loading}
      />

      {/* Movie Details Modal */}
      <MovieModal
        movie={selectedMovie}
        isOpen={!!selectedMovie}
        onClose={handleCloseModal}
        onPlay={handlePlayMovie}
      />

      {/* Video Player */}
      <VideoPlayer
        movieId={playingMovie?.id || 0}
        movieTitle={playingMovie?.title || ''}
        isOpen={!!playingMovie}
        onClose={handleClosePlayer}
      />
    </div>
  );
};

export default Index;
