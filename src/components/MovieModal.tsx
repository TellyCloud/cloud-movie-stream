import { X, Play, Star, Calendar, Globe } from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface MovieModalProps {
  movie: any;
  isOpen: boolean;
  onClose: () => void;
  onPlay: (movie: any) => void;
}

export function MovieModal({ movie, isOpen, onClose, onPlay }: MovieModalProps) {
  if (!movie) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 bg-card border-border overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{movie.title}</DialogTitle>
          <DialogDescription>Movie details and streaming options</DialogDescription>
        </DialogHeader>
        <div className="relative">
          {/* Close Button */}
          <EnhancedButton
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </EnhancedButton>

          {/* Hero Image */}
          <div className="relative h-64 md:h-80 overflow-hidden">
            <img
              src={`https://image.tmdb.org/t/p/original${movie.backdrop_path}`}
              alt={movie.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title and Meta */}
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">{movie.title}</h2>
              
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="text-yellow-400 font-medium">{movie.vote_average?.toFixed(1)}</span>
                  <span className="text-muted-foreground">({movie.vote_count} votes)</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{movie.release_date}</span>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span>{movie.original_language?.toUpperCase()}</span>
                </div>
              </div>
            </div>

            {/* Overview */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Overview</h3>
              <p className="text-muted-foreground leading-relaxed">{movie.overview}</p>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Popularity:</span>
                <span className="ml-2 text-muted-foreground">{Math.round(movie.popularity)}</span>
              </div>
              
              <div>
                <span className="font-medium">Adult Content:</span>
                <span className="ml-2 text-muted-foreground">{movie.adult ? 'Yes' : 'No'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <EnhancedButton 
                size="lg" 
                variant="play"
                className="flex-1"
                onClick={() => onPlay(movie)}
              >
                <Play className="w-5 h-5 mr-2 fill-current" />
                Watch Now
              </EnhancedButton>
              
              <EnhancedButton 
                size="lg" 
                variant="glass"
                className="flex-1"
              >
                Add to Watchlist
              </EnhancedButton>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}