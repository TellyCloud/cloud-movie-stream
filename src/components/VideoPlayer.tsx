import { X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface VideoPlayerProps {
  movieId: number;
  movieTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoPlayer({ movieId, movieTitle, isOpen, onClose }: VideoPlayerProps) {
  const [currentSource, setCurrentSource] = useState(0);
  const [hasError, setHasError] = useState(false);

  if (!isOpen) return null;

  // Multiple video sources for better availability
  const videoSources = [
    `https://autoembed.co/movie/tmdb/${movieId}`,
    `https://dbgo.fun/imdb.php?id=${movieId}`,
    `https://player.smashy.stream/movie/${movieId}`,
    `https://embed.su/embed/movie/${movieId}`,
    `https://moviesapi.club/movie/${movieId}`,
    `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`
  ];

  console.log('VideoPlayer - Movie ID:', movieId);
  console.log('VideoPlayer - Current source index:', currentSource);
  console.log('VideoPlayer - Current video URL:', videoSources[currentSource]);

  const handleError = () => {
    console.log('VideoPlayer - Error with source:', videoSources[currentSource]);
    console.log('VideoPlayer - Trying next source...');
    if (currentSource < videoSources.length - 1) {
      setCurrentSource(currentSource + 1);
      setHasError(false);
    } else {
      console.log('VideoPlayer - All sources failed');
      setHasError(true);
    }
  };

  const resetPlayer = () => {
    setCurrentSource(0);
    setHasError(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/70 text-white"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Video Player */}
      <div className="w-full h-full">
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Video Unavailable</h3>
            <p className="text-gray-300 text-center mb-6 max-w-md">
              Sorry, this movie is currently unavailable for streaming. This might be due to regional restrictions or temporary server issues.
            </p>
            <div className="flex gap-4">
              <Button onClick={resetPlayer} variant="outline">
                Try Again
              </Button>
              <Button onClick={onClose}>
                Back to Movies
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              Movie ID: {movieId} • {movieTitle}
            </p>
          </div>
        ) : (
          <iframe
            key={currentSource}
            src={videoSources[currentSource]}
            title={movieTitle}
            className="w-full h-full border-0"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation"
            onError={handleError}
            onLoad={() => setHasError(false)}
            referrerPolicy="no-referrer-when-downgrade"
          />
        )}
      </div>
    </div>
  );
}