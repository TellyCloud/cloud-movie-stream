import { X, AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';

interface VideoPlayerProps {
  movieId: number;
  movieTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function VideoPlayer({ movieId, movieTitle, isOpen, onClose }: VideoPlayerProps) {
  const [currentSource, setCurrentSource] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const videoSources = [
    `https://autoembed.co/movie/tmdb/${movieId}`,
    `https://dbgo.fun/imdb.php?id=${movieId}`,
    `https://player.smashy.stream/movie/${movieId}`,
    `https://embed.su/embed/movie/${movieId}`,
    `https://moviesapi.club/movie/${movieId}`,
    `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`
  ];

  useEffect(() => {
    // Reset state when movie changes
    setCurrentSource(0);
    setHasError(false);
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
  }, [movieId]);

  useEffect(() => {
    // Hide controls after 3 seconds of inactivity
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);
      handleMouseMove(); // Initial call to set the timeout
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, [isOpen]);

  const handleError = () => {
    if (currentSource < videoSources.length - 1) {
      setCurrentSource(currentSource + 1);
      setHasError(false);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const resetPlayer = () => {
    setCurrentSource(0);
    setHasError(false);
    setIsLoading(true);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
    // In a real implementation, you would send a message to the iframe
    // to play/pause the video using postMessage
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // In a real implementation, you would send a message to the iframe
    // to mute/unmute the video using postMessage
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white transition-opacity duration-300"
        onClick={onClose}
        style={{ opacity: showControls ? 1 : 0 }}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <Loader2 className="w-12 h-12 text-white animate-spin" />
          <p className="ml-3 text-white">Loading source {currentSource + 1} of {videoSources.length}</p>
        </div>
      )}

      {/* Video Player */}
      <div className="w-full h-full relative">
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Video Unavailable</h3>
            <p className="text-gray-300 text-center mb-6 max-w-md">
              Sorry, this movie is currently unavailable for streaming. This might be due to regional restrictions or temporary server issues.
            </p>
            <div className="flex gap-4">
              <Button onClick={resetPlayer} variant="outline" className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4" />
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
          <>
            <iframe
              ref={iframeRef}
              key={currentSource}
              src={videoSources[currentSource]}
              title={movieTitle}
              className="w-full h-full border-0"
              allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-pointer-lock allow-top-navigation"
              onError={handleError}
              onLoad={handleLoad}
              referrerPolicy="no-referrer-when-downgrade"
            />
            
            {/* Video Controls Overlay */}
            <div 
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar */}
              <div className="w-full mb-4">
                <Slider
                  value={[progress]}
                  max={100}
                  step={1}
                  onValueChange={(value) => setProgress(value[0])}
                  className="cursor-pointer"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                  </Button>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20"
                      onClick={toggleMute}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </Button>
                    
                    <Slider
                      value={[volume * 100]}
                      max={100}
                      step={1}
                      onValueChange={(value) => handleVolumeChange([value[0] / 100])}
                      className="w-24 cursor-pointer"
                    />
                  </div>
                  
                  <div className="text-white text-sm">
                    {Math.floor(progress / 60)}:{(progress % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={resetPlayer}
                  >
                    <RotateCcw className="w-5 h-5" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Source Indicator */}
            <div className="absolute top-4 left-4 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-70">
              Source {currentSource + 1}/{videoSources.length}
            </div>
            
            {/* Title Display */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-sm px-3 py-1 rounded opacity-90">
              {movieTitle}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
