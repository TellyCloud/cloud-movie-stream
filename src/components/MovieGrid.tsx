import { MovieCard } from './MovieCard';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface MovieGridProps {
  movies: any[];
  onMovieClick: (movie: any) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

export function MovieGrid({ movies, onMovieClick, onLoadMore, hasMore, loading }: MovieGridProps) {
  if (movies.length === 0 && !loading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h3 className="text-2xl font-semibold text-muted-foreground mb-2">No movies found</h3>
        <p className="text-muted-foreground">Try adjusting your filters or search criteria</p>
      </div>
    );
  }

  return (
    <section className="py-8 px-4">
      <div className="container mx-auto">
        {/* Movies Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          onClick={onMovieClick}
          onPlay={onMovieClick}
        />
      ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Load More Button */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-12">
            <Button
              onClick={onLoadMore}
              size="lg"
              variant="outline"
              className="border-border/50 hover:border-primary/50 hover:bg-primary/10"
            >
              Load More Movies
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}