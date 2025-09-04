import { X, AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2, Settings, Languages, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface VideoPlayerProps {
  movieId: number;
  movieTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

interface QualityLevel {
  index: number;
  label: string;
  height: number;
  width: number;
  bandwidth: number;
}

interface SubtitleTrack {
  index: number;
  label: string;
  language: string;
}

const CONTROLS_HIDE_DELAY = 3000;
const SKIP_DURATION = 10;

export function VideoPlayer({ movieId, movieTitle, isOpen, onClose }: VideoPlayerProps) {
  // State management
  const [currentSource, setCurrentSource] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [currentQuality, setCurrentQuality] = useState('auto');
  const [currentSubtitle, setCurrentSubtitle] = useState('off');
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [useIframe, setUseIframe] = useState(false);
  const [canPlayDirectly, setCanPlayDirectly] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);

  // Enhanced video sources with both direct and embed URLs
  const videoSources = useMemo(() => [
    // Direct video URLs (try these first)
    {
      type: 'direct',
      url: `https://vidsrc.to/embed/movie/${movieId}`,
      name: 'VidSrc Direct'
    },
    {
      type: 'direct', 
      url: `https://multiembed.mov/directstream.php?video_id=${movieId}&tmdb=1`,
      name: 'MultiEmbed Direct'
    },
    // Embed URLs (fallback)
    {
      type: 'embed',
      url: `https://autoembed.co/movie/tmdb/${movieId}`,
      name: 'AutoEmbed'
    },
    {
      type: 'embed',
      url: `https://player.smashy.stream/movie/${movieId}`,
      name: 'Smashy Stream'
    },
    {
      type: 'embed',
      url: `https://embed.su/embed/movie/${movieId}`,
      name: 'Embed.su'
    },
    {
      type: 'embed',
      url: `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`,
      name: 'VidSrc XYZ'
    },
    {
      type: 'embed',
      url: `https://2embed.org/embed/movie?tmdb=${movieId}`,
      name: '2Embed'
    },
    {
      type: 'embed',
      url: `https://www.2embed.to/embed/tmdb/movie?id=${movieId}`,
      name: '2Embed.to'
    }
  ], [movieId]);

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Try to extract direct video URL from embed pages
  const extractDirectVideoUrl = useCallback(async (embedUrl: string): Promise<string | null> => {
    try {
      // This is a simplified approach - in reality, you'd need a backend service
      // to extract video URLs from embed pages due to CORS restrictions
      
      // For now, we'll try some common patterns
      const directUrlPatterns = [
        embedUrl.replace('/embed/', '/stream/'),
        embedUrl.replace('/embed/', '/direct/'),
        embedUrl + '&direct=true',
        embedUrl + '/stream.m3u8'
      ];

      for (const url of directUrlPatterns) {
        try {
          const response = await fetch(url, { method: 'HEAD' });
          if (response.ok && response.headers.get('content-type')?.includes('video')) {
            return url;
          }
        } catch (e) {
          continue;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting direct URL:', error);
      return null;
    }
  }, []);

  // Enhanced error handling
  const handleError = useCallback((error: any, sourceIndex: number) => {
    console.error(`Video error on source ${sourceIndex + 1}:`, error);
    
    if (sourceIndex < videoSources.length - 1) {
      setCurrentSource(sourceIndex + 1);
      setErrorMessage(`${videoSources[sourceIndex].name} failed, trying next...`);
      setIsLoading(true);
    } else {
      setHasError(true);
      setIsLoading(false);
      setErrorMessage('All video sources failed to load. Please try again later.');
    }
  }, [videoSources]);

  // Try loading video source
  const tryLoadSource = useCallback(async (sourceIndex: number) => {
    if (sourceIndex >= videoSources.length) {
      handleError(new Error('All sources exhausted'), sourceIndex);
      return;
    }

    const source = videoSources[sourceIndex];
    setIsLoading(true);
    setHasError(false);
    setErrorMessage(`Loading ${source.name}...`);
    setUseIframe(false);
    setCanPlayDirectly(false);

    try {
      if (source.type === 'direct') {
        // Try to load as direct video
        await tryDirectVideo(source.url, sourceIndex);
      } else {
        // Try to extract direct URL first, then fallback to iframe
        const directUrl = await extractDirectVideoUrl(source.url);
        if (directUrl) {
          await tryDirectVideo(directUrl, sourceIndex);
        } else {
          // Use iframe as fallback
          setUseIframe(true);
          setIsLoading(false);
          setCanPlayDirectly(false);
        }
      }
    } catch (error) {
      console.error(`Failed to load source ${sourceIndex + 1}:`, error);
      handleError(error, sourceIndex);
    }
  }, [videoSources, handleError, extractDirectVideoUrl]);

  // Try loading direct video
  const tryDirectVideo = useCallback(async (url: string, sourceIndex: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!videoRef.current) {
        reject(new Error('Video element not available'));
        return;
      }

      const video = videoRef.current;
      
      // Reset video element
      video.src = '';
      video.load();

      const onLoadedData = () => {
        setIsLoading(false);
        setCanPlayDirectly(true);
        setUseIframe(false);
        setDuration(video.duration || 0);
        retryCountRef.current = 0;
        cleanup();
        resolve();
      };

      const onError = () => {
        console.error(`Direct video failed for source ${sourceIndex + 1}`);
        cleanup();
        reject(new Error('Direct video load failed'));
      };

      const onLoadStart = () => {
        setIsBuffering(true);
      };

      const onCanPlay = () => {
        setIsBuffering(false);
      };

      const cleanup = () => {
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('error', onError);
        video.removeEventListener('loadstart', onLoadStart);
        video.removeEventListener('canplay', onCanPlay);
      };

      // Add event listeners
      video.addEventListener('loadeddata', onLoadedData);
      video.addEventListener('error', onError);
      video.addEventListener('loadstart', onLoadStart);
      video.addEventListener('canplay', onCanPlay);

      // Set source and try to load
      video.src = url;
      video.load();

      // Timeout after 10 seconds
      setTimeout(() => {
        if (isLoading) {
          cleanup();
          reject(new Error('Video load timeout'));
        }
      }, 10000);
    });
  }, [isLoading]);

  // Initialize player
  useEffect(() => {
    if (!isOpen) return;

    setCurrentSource(0);
    setHasError(false);
    setIsLoading(true);
    retryCountRef.current = 0;
    
    tryLoadSource(0);
  }, [isOpen, movieId, tryLoadSource]);

  // Handle source changes
  useEffect(() => {
    if (currentSource > 0) {
      tryLoadSource(currentSource);
    }
  }, [currentSource, tryLoadSource]);

  // Setup video event listeners for direct playback
  useEffect(() => {
    if (!canPlayDirectly || !videoRef.current) return;

    const video = videoRef.current;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
    };
    const handleTimeUpdate = () => setProgress(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    const handleRateChange = () => setPlaybackRate(video.playbackRate);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ratechange', handleRateChange);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ratechange', handleRateChange);
    };
  }, [canPlayDirectly]);

  // Enhanced controls visibility management
  const hideControlsTimeout = useCallback(() => {
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings && (isPlaying || useIframe)) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_DELAY);
  }, [showSettings, isPlaying, useIframe]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    hideControlsTimeout();
  }, [hideControlsTimeout]);

  // Keyboard and mouse event handlers
  useEffect(() => {
    const handleMouseMove = () => showControlsTemporarily();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen || useIframe) return;
      
      showControlsTemporarily();
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipForward();
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          e.preventDefault();
          if (showSettings) {
            setShowSettings(false);
          } else {
            onClose();
          }
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('keydown', handleKeyDown);
      showControlsTemporarily();
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, [isOpen, showSettings, isPlaying, useIframe]);

  // Enhanced player controls
  const togglePlay = useCallback(() => {
    if (!canPlayDirectly || !videoRef.current) return;
    
    const video = videoRef.current;
    if (video.paused) {
      video.play().catch(console.error);
    } else {
      video.pause();
    }
  }, [canPlayDirectly]);

  const toggleMute = useCallback(() => {
    if (!canPlayDirectly || !videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  }, [canPlayDirectly]);

  const adjustVolume = useCallback((delta: number) => {
    if (!canPlayDirectly || !videoRef.current) return;
    const video = videoRef.current;
    video.volume = Math.max(0, Math.min(1, video.volume + delta));
  }, [canPlayDirectly]);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (!canPlayDirectly || !videoRef.current) return;
    const video = videoRef.current;
    video.volume = value[0];
    if (value[0] > 0 && video.muted) {
      video.muted = false;
    }
  }, [canPlayDirectly]);

  const skipForward = useCallback(() => {
    if (!canPlayDirectly || !videoRef.current) return;
    const video = videoRef.current    video.currentTime = Math.min(duration, video.currentTime + SKIP_DURATION);
  }, [canPlayDirectly, duration]);

  const skipBackward = useCallback(() => {
    if (!canPlayDirectly || !videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = Math.max(0, video.currentTime - SKIP_DURATION);
  }, [canPlayDirectly]);

  const handleProgressChange = useCallback((value: number[]) => {
    if (!canPlayDirectly || !videoRef.current) return;
    const video = videoRef.current;
    video.currentTime = value[0];
    setProgress(value[0]);
  }, [canPlayDirectly]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen().catch(console.error);
    }
  }, []);

  const handlePlaybackRateChange = useCallback((rate: string) => {
    if (!canPlayDirectly || !videoRef.current) return;
    const video = videoRef.current;
    video.playbackRate = parseFloat(rate);
    setPlaybackRate(parseFloat(rate));
  }, [canPlayDirectly]);

  const resetPlayer = useCallback(() => {
    setCurrentSource(0);
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    setUseIframe(false);
    setCanPlayDirectly(false);
    retryCountRef.current = 0;
  }, []);

  const switchToNextSource = useCallback(() => {
    if (currentSource < videoSources.length - 1) {
      setCurrentSource(prev => prev + 1);
    } else {
      setHasError(true);
      setErrorMessage('All sources have been tried.');
    }
  }, [currentSource, videoSources.length]);

  if (!isOpen) return null;

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center"
      onClick={showControlsTemporarily}
    >
      {/* Close Button */}
      <Button
        variant="ghost"
        size="icon"
        className={`absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </Button>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/50">
          <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
          <p className="text-white text-center">
            {errorMessage || `Loading ${videoSources[currentSource]?.name || 'video'}...`}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Source {currentSource + 1} of {videoSources.length}
          </p>
          {currentSource > 0 && (
            <p className="text-gray-400 text-sm mt-1">
              Previous sources failed, trying alternatives...
            </p>
          )}
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && !isLoading && canPlayDirectly && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/70 rounded-full p-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Video Player */}
      <div className="w-full h-full relative">
        {hasError ? (
          <div className="flex flex-col items-center justify-center h-full text-white p-8">
            <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
            <h3 className="text-2xl font-bold mb-2">Video Unavailable</h3>
            <p className="text-gray-300 text-center mb-2 max-w-md">
              {errorMessage || 'Sorry, this movie is currently unavailable for streaming.'}
            </p>
            <p className="text-gray-400 text-center mb-6 max-w-md text-sm">
              This might be due to regional restrictions, temporary server issues, or content licensing limitations.
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
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Movie ID: {movieId} • {movieTitle}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Attempted {videoSources.length} sources
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* HTML5 Video Player (for direct streams) */}
            {canPlayDirectly && (
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                playsInline
                crossOrigin="anonymous"
                onClick={showControlsTemporarily}
                onDoubleClick={toggleFullscreen}
              />
            )}

            {/* Iframe Player (for embed sources) */}
            {useIframe && !canPlayDirectly && (
              <iframe
                ref={iframeRef}
                src={videoSources[currentSource]?.url}
                className="w-full h-full border-0"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture"
                sandbox="allow-same-origin allow-scripts allow-presentation"
                onLoad={() => {
                  setIsLoading(false);
                  setIsBuffering(false);
                }}
                onError={() => {
                  console.error('Iframe failed to load');
                  switchToNextSource();
                }}
              />
            )}
            
            {/* Custom Video Controls Overlay (only for direct video) */}
            {canPlayDirectly && (
              <div 
                className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 transition-all duration-300 ${showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Progress Bar */}
                <div className="w-full mb-6">
                  <div className="flex items-center justify-between text-xs text-gray-300 mb-2">
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <Slider
                    value={[progress]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={handleProgressChange}
                    className="cursor-pointer hover:scale-y-150 transition-transform"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Play/Pause */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 transition-colors"
                      onClick={togglePlay}
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6" />
                      )}
                    </Button>

                    {/* Skip Controls */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 transition-colors"
                      onClick={skipBackward}
                      title={`Skip back ${SKIP_DURATION}s`}
                    >
                      <SkipBack className="w-5 h-5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 transition-colors"
                      onClick={skipForward}
                      title={`Skip forward ${SKIP_DURATION}s`}
                    >
                      <SkipForward className="w-5 h-5" />
                    </Button>
                    
                    {/* Volume Controls */}
                    <div className="flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white hover:bg-white/20 transition-colors"
                        onClick={toggleMute}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-5 h-5" />
                        ) : (
                          <Volume2 className="w-5 h-5" />
                        )}
                      </Button>
                      
                      <div className="flex items-center space-x-2">
                        <Slider
                          value={[isMuted ? 0 : volume * 100]}
                          max={100}
                          step={1}
                          onValueChange={(value) => handleVolumeChange([value[0] / 100])}
                          className="w-24 cursor-pointer"
                        />
                        <span className="text-xs text-gray-300 w-8 text-right">
                          {Math.round((isMuted ? 0 : volume) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {/* Playback Speed Indicator */}
                    {playbackRate !== 1 && (
                      <span className="text-white text-sm bg-white/20 px-2 py-1 rounded">
                        {playbackRate}x
                      </span>
                    )}

                    {/* Settings Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`text-white hover:bg-white/20 transition-colors ${showSettings ? 'bg-white/20' : ''}`}
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                    
                    {/* Reset Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 transition-colors"
                      onClick={resetPlayer}
                      title="Reset player"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </Button>
                    
                    {/* Fullscreen Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 transition-colors"
                      onClick={toggleFullscreen}
                      title="Toggle fullscreen (F)"
                    >
                      <Maximize className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Settings Panel (only for direct video) */}
            {showSettings && canPlayDirectly && (
              <div className="absolute right-4 bottom-24 bg-black/95 backdrop-blur-md text-white p-6 rounded-lg min-w-[250px] border border-white/10 shadow-2xl">
                <div className="space-y-6">
                  {/* Playback Speed */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-200">Playback Speed</label>
                    <Select value={playbackRate.toString()} onValueChange={handlePlaybackRateChange}>
                      <SelectTrigger className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/20 backdrop-blur-md">
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                          <SelectItem key={rate} value={rate.toString()} className="text-white hover:bg-white/20">
                            {rate}x {rate === 1 ? '(Normal)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Source Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-200">Video Source</label>
                    <Select value={currentSource.toString()} onValueChange={(value) => setCurrentSource(parseInt(value))}>
                      <SelectTrigger className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/20 backdrop-blur-md">
                        {videoSources.map((source, index) => (
                          <SelectItem key={index} value={index.toString()} className="text-white hover:bg-white/20">
                            {source.name} {index === currentSource ? '(Current)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Keyboard Shortcuts Info */}
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs text-gray-400 mb-2">Keyboard Shortcuts:</p>
                    <div className="text-xs text-gray-500 space-y-1">
                      <div>Space: Play/Pause</div>
                      <div>← →: Skip 10s</div>
                      <div>↑ ↓: Volume</div>
                      <div>F: Fullscreen</div>
                      <div>M: Mute</div>
                      <div>Esc: Close/Settings</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Enhanced Status Indicators */}
            <div className={`absolute top-4 left-4 space-y-2 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              {/* Source Indicator */}
              <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                {videoSources[currentSource]?.name} ({currentSource + 1}/{videoSources.length})
              </div>
              
              {/* Player Type Indicator */}
              <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                {canPlayDirectly ? 'HTML5 Player' : useIframe ? 'Embed Player' : 'Loading...'}
              </div>

              {/* Quality Indicator */}
              {canPlayDirectly && playbackRate !== 1 && (
                <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                  {playbackRate}x Speed
                </div>
              )}

              {/* Live Indicator for streams */}
              {duration === Infinity && canPlayDirectly && (
                <div className="bg-red-600 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm flex items-center gap-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  LIVE
                </div>
              )}
            </div>
            
            {/* Enhanced Title Display */}
            <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              <div className="text-center">
                <div className="font-medium">{movieTitle}</div>
                <div className="text-xs text-gray-300 mt-1">Movie ID: {movieId}</div>
              </div>
            </div>

            {/* Click to play overlay when paused (only for direct video) */}
            {!isPlaying && !isLoading && !hasError && canPlayDirectly && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                onClick={togglePlay}
              >
                <div className="bg-black/50 rounded-full p-6 group-hover:bg-black/70 transition-colors group-hover:scale-110 transform duration-200">
                  <Play className="w-16 h-16 text-white" />
                </div>
              </div>
            )}

            {/* Picture-in-Picture Button (if supported and direct video) */}
            {document.pictureInPictureEnabled && canPlayDirectly && (
              <Button
                variant="ghost"
                size="icon"
                className={`absolute top-4 right-16 bg-black/50 hover:bg-black/70 text-white transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => {
                  if (videoRef.current) {
                    if (document.pictureInPictureElement) {
                      document.exitPictureInPicture();
                    } else {
                      videoRef.current.requestPictureInPicture().catch(console.error);
                    }
                  }
                }}
                title="Picture in Picture"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <rect x="8" y="8" width="8" height="6" rx="1" ry="1"/>
                </svg>
              </Button>
            )}

            {/* Mini Player Controls (when controls are hidden and direct video) */}
            {!showControls && isPlaying && canPlayDirectly && (
              <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/70 rounded-full px-3 py-2 backdrop-blur-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  onClick={togglePlay}
                >
                  <Pause className="w-4 h-4" />
                </Button>
                <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-300"
                    style={{ width: `${(progress / duration) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Source Switch Button */}
            {!isLoading && !hasError && currentSource < videoSources.length - 1 && (
              <Button
                variant="ghost"
                className={`absolute bottom-4 left-4 bg-black/70 hover:bg-black/90 text-white text-sm transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={switchToNextSource}
              >
                Try Next Source ({currentSource + 2}/{videoSources.length})
              </Button>
            )}

            {/* Error Recovery Toast */}
            {currentSource > 0 && !hasError && !isLoading && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-600/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm">
                Switched to {videoSources[currentSource]?.name}
              </div>
            )}

            {/* Network Status Indicator */}
            {navigator.onLine === false && (
              <div className="absolute top-20 right-4 bg-red-600/90 text-white px-3 py-2 rounded-lg backdrop-blur-sm text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No Internet Connection
              </div>
            )}

            {/* Iframe Controls Overlay (for embed players) */}
            {useIframe && !canPlayDirectly && !isLoading && (
              <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-white text-sm">
                      Playing via {videoSources[currentSource]?.name}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={switchToNextSource}
                      disabled={currentSource >= videoSources.length - 1}
                    >
                      Try Next Source
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white hover:bg-white/20"
                      onClick={resetPlayer}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Global Click Handler for Mobile */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ 
          background: showControls ? 'transparent' : 'transparent',
          pointerEvents: showControls ? 'none' : 'auto'
        }}
        onClick={showControlsTemporarily}
      />
    </div>
  );
}

// Additional utility functions for better video handling
export const VideoPlayerUtils = {
  // Check if URL is a direct video file
  isDirectVideoUrl: (url: string): boolean => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.m3u8'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  },

  // Extract video ID from various URL formats
  extractVideoId: (url: string): string | null => {
    const patterns = [
      /\/movie\/(\d+)/,
      /tmdb[=\/](\d+)/,
      /id[=\/](\d+)/,
      /video_id[=\/](\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  },

  // Generate alternative URLs for a movie ID
  generateAlternativeUrls: (movieId: number): string[] => {
    return [
      `https://vidsrc.to/embed/movie/${movieId}`,
      `https://www.2embed.to/embed/tmdb/movie?id=${movieId}`,
      `https://autoembed.co/movie/tmdb/${movieId}`,
      `https://player.smashy.stream/movie/${movieId}`,
      `https://embed.su/embed/movie/${movieId}`,
      `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`,
      `https://2embed.org/embed/movie?tmdb=${movieId}`,
      `https://multiembed.mov/?video_id=${movieId}&tmdb=1`,
      `https://www.fembed.com/v/${movieId}`,
      `https://streamtape.com/e/${movieId}`
    ];
  },

  // Check if browser supports various video features
  getBrowserCapabilities: () => {
    const video = document.createElement('video');
    return {
      canPlayMP4: video.canPlayType('video/mp4') !== '',
      canPlayWebM: video.canPlayType('video/webm') !== '',
      canPlayHLS: video.canPlayType('application/vnd.apple.mpegurl') !== '',
      supportsPiP: 'pictureInPictureEnabled' in document,
      supportsFullscreen: 'requestFullscreen' in video,
      supportsAutoplay: 'autoplay' in video
    };
  }
};

export default VideoPlayer;
