import { Star, Play, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MovieCardProps {
  movie: any;
  onClick: (movie: any) => void;
  onPlay?: (movie: any) => void;
}

export function MovieCard({ movie, onClick, onPlay }: MovieCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(movie);
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay) {
      onPlay(movie);
    }
  };

  return (
    <div className="movie-card relative group rounded-xl overflow-hidden">
      {/* Movie Poster */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
      
      {/* Movie Info Footer */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent">
        <h3 className="font-semibold text-white line-clamp-2 mb-2 text-sm">
          {movie.title}
        </h3>
        
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center space-x-1">
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <span className="text-yellow-400 font-medium">
              {movie.vote_average?.toFixed(1)}
            </span>
          </div>
          
          <span className="text-gray-300">
            {movie.release_date?.split('-')[0]}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Button
            size="sm"
            variant="default"
            onClick={handlePlayClick}
            className="flex-1 h-8 text-xs"
          >
            <Play className="w-3 h-3 mr-1" />
            Play
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCardClick}
            className="flex-1 h-8 text-xs"
          >
            <Info className="w-3 h-3 mr-1" />
            Details
          </Button>
        </div>
      </div>
      
      {/* Rating Badge */}
      {movie.vote_average >= 8 && (
        <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded">
          HOT
        </div>
      )}
    </div>
  );
}