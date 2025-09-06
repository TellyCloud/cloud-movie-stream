import { Play, Info, Star } from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import heroBackground from '@/assets/hero-background.jpg';

interface HeroSectionProps {
  movie: any;
  onPlayMovie: (movie: any) => void;
  onShowDetails: (movie: any) => void;
}

export function HeroSection({ movie, onPlayMovie, onShowDetails }: HeroSectionProps) {
  const backgroundImage = movie?.backdrop_path 
    ? `url(https://image.tmdb.org/t/p/original${movie.backdrop_path})`
    : `url(${heroBackground})`;

  const title = movie?.title || "Unlimited Movies";
  const overview = movie?.overview || "Stream the latest movies and TV shows online for free. Watch unlimited content in stunning HD quality.";

  return (
    <section className="relative h-screen flex items-center justify-start overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transform scale-105"
        style={{ backgroundImage }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 hero-overlay" />
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 max-w-2xl">
        <div className="space-y-6">
          {/* Movie Title */}
          <h1 className="text-4xl md:text-6xl font-bold leading-tight">
            {title}
          </h1>
          
          {/* Movie Meta */}
          {movie && (
            <div className="flex items-center space-x-4 text-sm md:text-base">
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-yellow-400 fill-current" />
                <span className="text-yellow-400 font-medium">{movie.vote_average?.toFixed(1)}</span>
              </div>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">{movie.release_date?.split('-')[0]}</span>
              <span className="text-muted-foreground">•</span>
              <span className="text-muted-foreground">Movie</span>
            </div>
          )}
          
          {/* Movie Overview */}
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
            {overview}
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <EnhancedButton 
              size="xl" 
              variant="premium"
              className="text-lg px-8 py-6"
              onClick={() => movie ? onPlayMovie(movie) : undefined}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              {movie ? 'Watch Now' : 'Explore Movies'}
            </EnhancedButton>
            
            {movie && (
              <EnhancedButton 
                size="xl" 
                variant="glass"
                className="text-lg px-8 py-6"
                onClick={() => onShowDetails(movie)}
              >
                <Info className="w-5 h-5 mr-2" />
                More Info
              </EnhancedButton>
            )}
          </div>
        </div>
      </div>
      
      {/* Fade to content */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}