import { Star, Play } from 'lucide-react';

interface MovieCardProps {
  movie: any;
  onClick: (movie: any) => void;
}

export function MovieCard({ movie, onClick }: MovieCardProps) {
  return (
    <div 
      className="movie-card relative group cursor-pointer rounded-xl overflow-hidden"
      onClick={() => onClick(movie)}
    >
      {/* Movie Poster */}
      <div className="relative aspect-[2/3] overflow-hidden">
        <img
          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-primary/90 rounded-full p-3 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-6 h-6 text-primary-foreground fill-current" />
          </div>
        </div>
      </div>
      
      {/* Movie Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
        <h3 className="font-semibold text-white line-clamp-2 mb-1">
          {movie.title}
        </h3>
        
        <div className="flex items-center justify-between text-sm">
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