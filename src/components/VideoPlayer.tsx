import { X, AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2, Settings, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import '@videojs/http-streaming';
import 'videojs-contrib-quality-levels';

// Extend VideoJS types for quality levels
declare module 'video.js' {
  interface Player {
    qualityLevels?: () => any;
  }
}

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
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [currentSubtitle, setCurrentSubtitle] = useState('off');
  const [qualityLevels, setQualityLevels] = useState<any[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);

  // HLS video sources - these should be actual HLS streams
  const videoSources = [
    `https://autoembed.co/movie/tmdb/${movieId}`,
    `https://player.smashy.stream/movie/${movieId}`,
    `https://embed.su/embed/movie/${movieId}`,
    `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`,
  ];

  // Initialize Video.js player
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const player = videojs(videoRef.current, {
      controls: false, // We'll use custom controls
      fluid: true,
      responsive: true,
      techOrder: ['html5'],
      html5: {
        hls: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true
        }
      },
      playsinline: true
    });

    playerRef.current = player;

    // Try loading sources
    const trySource = (sourceIndex: number) => {
      if (sourceIndex >= videoSources.length) {
        setHasError(true);
        setIsLoading(false);
        return;
      }

      player.src({
        src: videoSources[sourceIndex],
        type: 'application/x-mpegURL'
      });

      player.ready(() => {
        setIsLoading(false);
        
        // Setup quality levels if available
        if ((player as any).qualityLevels) {
          const levels = (player as any).qualityLevels();
          const levelArray = [];
          for (let i = 0; i < levels.length; i++) {
            levelArray.push({
              index: i,
              label: `${levels[i].height}p`,
              height: levels[i].height,
              width: levels[i].width,
              bandwidth: levels[i].bandwidth
            });
          }
          setQualityLevels(levelArray);
        }

        // Setup subtitle tracks
        const tracks = player.textTracks();
        const trackArray = [];
        for (let i = 0; i < (tracks as any).length; i++) {
          const track = tracks[i];
          if (track.kind === 'subtitles' || track.kind === 'captions') {
            trackArray.push({
              index: i,
              label: track.label || track.language || `Track ${i + 1}`,
              language: track.language
            });
          }
        }
        setSubtitleTracks(trackArray);
      });

      player.on('error', () => {
        console.error('Video.js error, trying next source');
        setCurrentSource(sourceIndex + 1);
        trySource(sourceIndex + 1);
      });

      player.on('loadeddata', () => {
        setHasError(false);
        setIsLoading(false);
        setDuration(player.duration() || 0);
      });

      // Add event listeners for UI sync
      player.on('play', () => setIsPlaying(true));
      player.on('pause', () => setIsPlaying(false));
      player.on('volumechange', () => {
        setVolume(player.volume());
        setIsMuted(player.muted());
      });
      player.on('timeupdate', () => {
        setProgress(player.currentTime() || 0);
      });
      player.on('durationchange', () => {
        setDuration(player.duration() || 0);
      });
    };

    trySource(currentSource);

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [isOpen, movieId]);

  // Hide controls after 3 seconds of inactivity
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSettings) {
          setShowControls(false);
        }
      }, 3000);
    };

    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);
      handleMouseMove();
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, [isOpen, showSettings]);

  const togglePlay = () => {
    if (playerRef.current) {
      if (playerRef.current.paused()) {
        playerRef.current.play();
      } else {
        playerRef.current.pause();
      }
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted(!playerRef.current.muted());
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (playerRef.current) {
      playerRef.current.volume(value[0]);
    }
  };

  const toggleFullscreen = () => {
    if (playerRef.current) {
      if (playerRef.current.isFullscreen()) {
        playerRef.current.exitFullscreen();
      } else {
        playerRef.current.requestFullscreen();
      }
    }
  };

  const handleQualityChange = (quality: string) => {
    if (playerRef.current && (playerRef.current as any).qualityLevels) {
      const levels = (playerRef.current as any).qualityLevels();
      
      if (quality === 'auto') {
        // Enable automatic quality selection
        for (let i = 0; i < levels.length; i++) {
          levels[i].enabled = true;
        }
      } else {
        // Disable all levels except selected
        const selectedHeight = parseInt(quality.replace('p', ''));
        for (let i = 0; i < levels.length; i++) {
          levels[i].enabled = levels[i].height === selectedHeight;
        }
      }
      setCurrentQuality(quality);
    }
  };

  const handleSubtitleChange = (subtitle: string) => {
    if (playerRef.current) {
      const tracks = playerRef.current.textTracks();
      
      // Disable all tracks first
      for (let i = 0; i < (tracks as any).length; i++) {
        tracks[i].mode = 'disabled';
      }
      
      if (subtitle !== 'off') {
        const trackIndex = parseInt(subtitle);
        if (tracks[trackIndex]) {
          tracks[trackIndex].mode = 'showing';
        }
      }
      setCurrentSubtitle(subtitle);
    }
  };

  const resetPlayer = () => {
    setCurrentSource(0);
    setHasError(false);
    setIsLoading(true);
    if (playerRef.current) {
      playerRef.current.src(videoSources[0]);
    }
  };

  if (!isOpen) return null;

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
            {/* Video.js Player */}
            <video
              ref={videoRef}
              className="video-js vjs-default-skin w-full h-full"
              data-setup="{}"
              playsInline
            />
            
            {/* Custom Video Controls Overlay */}
            <div 
              className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Progress Bar */}
              <div className="w-full mb-4">
                <Slider
                  value={[progress]}
                  max={duration || 100}
                  step={1}
                  onValueChange={(value) => {
                    if (playerRef.current) {
                      playerRef.current.currentTime(value[0]);
                      setProgress(value[0]);
                    }
                  }}
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
                      {isMuted ? (
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
                    {Math.floor(progress / 60)}:{(progress % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Settings Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-5 h-5" />
                  </Button>
                  
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

            {/* Settings Panel */}
            {showSettings && (
              <div className="absolute right-4 bottom-20 bg-black/90 backdrop-blur-sm text-white p-4 rounded-lg min-w-[200px]">
                <div className="space-y-4">
                  {/* Quality Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Quality</label>
                    <Select value={currentQuality} onValueChange={handleQualityChange}>
                      <SelectTrigger className="w-full bg-transparent border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-white/20">
                        <SelectItem value="auto">Auto</SelectItem>
                        {qualityLevels.map((level) => (
                          <SelectItem key={level.index} value={level.label}>
                            {level.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subtitle Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                      <Languages className="w-4 h-4" />
                      Subtitles
                    </label>
                    <Select value={currentSubtitle} onValueChange={handleSubtitleChange}>
                      <SelectTrigger className="w-full bg-transparent border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black border-white/20">
                        <SelectItem value="off">Off</SelectItem>
                        {subtitleTracks.map((track) => (
                          <SelectItem key={track.index} value={track.index.toString()}>
                            {track.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
            
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
