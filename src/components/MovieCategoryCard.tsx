import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MovieCard } from './MovieCard';
import { tmdbService, Movie } from '@/services/tmdb';
import { Loader2, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { handleSecureError } from '@/lib/error-handler';

interface MovieCategoryCardProps {
  title: string;
  category: 'popular' | 'top_rated' | 'latest' | 'upcoming';
  onMovieClick: (movie: Movie) => void;
  onPlayMovie: (movie: Movie) => void;
}

export function MovieCategoryCard({ title, category, onMovieClick, onPlayMovie }: MovieCategoryCardProps) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMovies();
  }, [category]);

  const loadMovies = async () => {
    try {
      setLoading(true);
      let response;
      
      switch (category) {
        case 'popular':
          response = await tmdbService.getPopularMovies();
          break;
        case 'top_rated':
          response = await tmdbService.getTopRatedMovies();
          break;
        case 'latest':
          response = await tmdbService.getLatestMovies();
          break;
        case 'upcoming':
          response = await tmdbService.getUpcomingMovies();
          break;
        default:
          response = await tmdbService.getPopularMovies();
      }
      
      setMovies(response.results || []);
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

  const displayedMovies = showAll ? movies : movies.slice(0, 6);

  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-xl font-semibold text-foreground">
          {title}
        </CardTitle>
        {movies.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="text-muted-foreground hover:text-foreground"
          >
            {showAll ? 'Show Less' : 'View All'}
            <ChevronRight className={`ml-1 h-4 w-4 transition-transform ${showAll ? 'rotate-90' : ''}`} />
          </Button>
        )}
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {displayedMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onClick={onMovieClick}
                onPlay={onPlayMovie}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}