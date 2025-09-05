import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MovieCard } from './MovieCard';
import { tmdbService, Movie } from '@/services/tmdb';
import { Loader2, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleSecureError } from '@/lib/error-handler';
import { useInView } from 'react-intersection-observer';

interface MovieCategoryCardProps {
  title: string;
  category: 'popular' | 'top_rated' | 'latest' | 'upcoming';
  onMovieClick: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
  // Filter props
  selectedGenre?: string;
  selectedYear?: string;
  selectedSort?: string;
  selectedAdult?: string;
  selectedLanguage?: string;
}

export function MovieCategoryCard({ 
  title, 
  category, 
  onMovieClick, 
  onPlayMovie,
  selectedGenre = 'all',
  selectedYear = 'all',
  selectedSort = 'popularity.desc',
  selectedAdult = 'false',
  selectedLanguage = 'all'
}: MovieCategoryCardProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { toast } = useToast();

  // Infinite scroll setup
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });

  // Reset and reload when category or filters change
  useEffect(() => {
    setCurrentPage(1);
    setMovies([]);
    setHasMore(true);
    loadMovies(1, false);
  }, [category, selectedGenre, selectedYear, selectedSort, selectedAdult, selectedLanguage]);

  // Auto-load more when scroll sentinel comes into view
  useEffect(() => {
    if (inView && hasMore && !loading && currentPage > 1) {
      loadMovies(currentPage + 1, true);
    }
  }, [inView, hasMore, loading, currentPage]);

  const loadMovies = async (page = 1, append = false) => {
    try {
      setLoading(true);
      let response;
      
      // Apply filters based on category
      const shouldApplyFilters = category === 'popular' || category === 'top_rated';
      
      if (shouldApplyFilters) {
        // Use discover API with filters for popular and top_rated categories
        const discoverParams = {
          page,
          with_genres: selectedGenre === 'all' ? '' : selectedGenre,
          year: selectedYear === 'all' ? '' : selectedYear,
          sort_by: category === 'popular' ? 'popularity.desc' : 'vote_average.desc',
          adult_filter: selectedAdult === 'all' ? '' : selectedAdult,
          with_original_language: selectedLanguage === 'all' ? '' : selectedLanguage,
        };
        response = await tmdbService.discoverMovies(discoverParams);
      } else {
        // Use specific endpoints for latest and upcoming
        switch (category) {
          case 'latest':
            response = await tmdbService.getLatestMovies(page);
            break;
          case 'upcoming':
            response = await tmdbService.getUpcomingMovies(page);
            break;
          default:
            response = await tmdbService.getPopularMovies(page);
        }
      }
      
      if (append) {
        setMovies(prev => [...prev, ...response.results]);
      } else {
        setMovies(response.results || []);
      }
      
      setTotalPages(response.total_pages);
      setCurrentPage(page);
      setHasMore(page < response.total_pages);
    } catch (error) {
      console.error(`Error loading ${category} movies:`, error);
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

  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMovies(currentPage + 1, true);
    }
  };

  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">
          {title} ({movies.length} movies)
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading && movies.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {movies.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  onClick={onMovieClick}
                  onPlay={onPlayMovie}
                />
              ))}
            </div>
            
            {/* Loading State for More Movies */}
            {loading && movies.length > 0 && (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}
            
            {/* Infinite Scroll Sentinel and Load More Button */}
            {hasMore && (
              <div ref={ref} className="flex justify-center mt-8">
                {!loading && (
                  <Button
                    onClick={handleLoadMore}
                    variant="outline"
                    className="border-border/50 hover:border-primary/50 hover:bg-primary/10"
                  >
                    Load More
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}