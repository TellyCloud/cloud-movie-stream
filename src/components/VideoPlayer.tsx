import { X, AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2, Settings, Languages, SkipForward, SkipBack } from 'lucide-react';
import { EnhancedButton } from '@/components/ui/enhanced-button';
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
    const video = videoRef.current;
    video.currentTime = Math.min(duration, video.currentTime + SKIP_DURATION);
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
      <EnhancedButton
        variant="ghost"
        size="icon"
        className={`absolute top-4 right-4 z-20 bg-black/50 hover:bg-black/70 text-white transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </EnhancedButton>

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

      {/* Video Player */}
      <div className="w-full h-full relative">
        {hasError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white p-8">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Video Unavailable</h3>
              <p className="text-gray-300 mb-6 max-w-md">
                {errorMessage}
              </p>
              <div className="flex gap-4 justify-center">
                <EnhancedButton
                  onClick={resetPlayer}
                  variant="play"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Try Again
                </EnhancedButton>
                <EnhancedButton onClick={onClose} variant="glass">
                  Back to Movies
                </EnhancedButton>
              </div>
            </div>
          </div>
        ) : useIframe ? (
          <iframe
            ref={iframeRef}
            src={videoSources[currentSource]?.url}
            className="w-full h-full"
            allowFullScreen
            frameBorder="0"
            title={movieTitle}
            onLoad={() => setIsLoading(false)}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            controls={false}
            autoPlay
            onClick={togglePlay}
          />
        )}

        {/* Enhanced Video Controls for Direct Playback */}
        {canPlayDirectly && (
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            {/* Progress Bar */}
            <div className="absolute bottom-20 left-4 right-4 pointer-events-auto">
              <div className="flex items-center space-x-4 bg-black/70 rounded-full px-4 py-3 backdrop-blur-sm">
                <span className="text-white text-sm min-w-[3rem]">
                  {formatTime(progress)}
                </span>
                
                <Slider
                  value={[progress]}
                  max={duration}
                  step={1}
                  onValueChange={handleProgressChange}
                  className="flex-1"
                />
                
                <span className="text-white text-sm min-w-[3rem]">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            {/* Main Controls */}
            <div className="absolute bottom-4 left-4 right-4 pointer-events-auto">
              <div className="flex items-center justify-between bg-black/70 rounded-full px-6 py-3 backdrop-blur-sm">
                <div className="flex items-center space-x-4">
                  {/* Play/Pause */}
                  <EnhancedButton
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
                  </EnhancedButton>

                  {/* Skip Controls */}
                  <EnhancedButton
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 transition-colors"
                    onClick={skipBackward}
                  >
                    <SkipBack className="w-5 h-5" />
                  </EnhancedButton>

                  <EnhancedButton
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 transition-colors"
                    onClick={skipForward}
                  >
                    <SkipForward className="w-5 h-5" />
                  </EnhancedButton>
                  
                  {/* Volume Control */}
                  <div className="flex items-center space-x-3">
                    <EnhancedButton
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
                    </EnhancedButton>
                    
                    <div className="w-20">
                      <Slider
                        value={[isMuted ? 0 : volume]}
                        max={1}
                        step={0.1}
                        onValueChange={handleVolumeChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {/* Playback Speed */}
                  {playbackRate !== 1 && (
                    <span className="text-white text-sm bg-white/20 px-2 py-1 rounded">
                      {playbackRate}x
                    </span>
                  )}

                  {/* Settings Button */}
                  <EnhancedButton
                    variant="ghost"
                    size="icon"
                    className={`text-white hover:bg-white/20 transition-colors ${showSettings ? 'bg-white/20' : ''}`}
                    onClick={() => setShowSettings(!showSettings)}
                  >
                    <Settings className="w-5 h-5" />
                  </EnhancedButton>
                  
                  {/* Reset Button */}
                  <EnhancedButton
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 transition-colors"
                    onClick={resetPlayer}
                    title="Reset player"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </EnhancedButton>
                  
                  {/* Fullscreen Button */}
                  <EnhancedButton
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20 transition-colors"
                    onClick={toggleFullscreen}
                  >
                    <Maximize className="w-5 h-5" />
                  </EnhancedButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Settings Panel */}
        {showSettings && canPlayDirectly && (
          <div className="absolute top-20 right-4 w-80 bg-black/90 backdrop-blur-sm rounded-lg border border-white/20 p-4 z-30">
            <h3 className="text-white font-semibold mb-4">Video Settings</h3>
            
            {/* Playback Speed */}
            <div className="mb-4">
              <label className="text-white text-sm font-medium mb-2 block">Playback Speed</label>
              <Select value={playbackRate.toString()} onValueChange={handlePlaybackRateChange}>
                <SelectTrigger className="bg-white/10 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">Normal</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                  <SelectItem value="2">2x</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Close Settings */}
            <EnhancedButton
              variant="ghost"
              onClick={() => setShowSettings(false)}
              className="w-full mt-4 text-white hover:bg-white/20"
            >
              Close Settings
            </EnhancedButton>
          </div>
        )}

        {/* Click to Play Overlay for Direct Video */}
        {canPlayDirectly && !isPlaying && !showControls && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
            <div className="bg-black/50 rounded-full p-8 transition-all duration-300 hover:bg-black/70">
              <Play className="w-16 h-16 text-white" />
            </div>
          </div>
        )}

        {/* Source Info for iFrame */}
        {useIframe && (
          <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-black/70 rounded-full px-3 py-2 backdrop-blur-sm">
            <EnhancedButton
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 transition-colors"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              <Pause className="w-4 h-4" />
            </EnhancedButton>
            <div className="w-16 h-1 bg-white/30 rounded-full overflow-hidden">
              <div className="h-full bg-white/70 w-1/3"></div>
            </div>
          </div>
        )}

        {/* Source Switch Button */}
        {!isLoading && !hasError && currentSource < videoSources.length - 1 && (
          <EnhancedButton
            variant="ghost"
            className={`absolute bottom-4 left-4 bg-black/70 hover:bg-black/90 text-white text-sm transition-all duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={switchToNextSource}
          >
            Try Next Source ({currentSource + 2}/{videoSources.length})
          </EnhancedButton>
        )}
      </div>

      {/* Buffering Indicator */}
      {isBuffering && !isLoading && canPlayDirectly && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <div className="bg-black/70 rounded-full p-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
        </div>
      )}

      {/* Alternative Source Loading */}
      {isLoading && currentSource > 0 && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-black/70 rounded-lg px-4 py-2 z-20">
          <div className="flex items-center space-x-2 text-white">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Loading alternative source...</span>
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <EnhancedButton
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={switchToNextSource}
            >
              Try Next Source
            </EnhancedButton>
            <EnhancedButton
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20"
              onClick={resetPlayer}
            >
              <RotateCcw className="w-4 h-4" />
            </EnhancedButton>
          </div>
        </div>
      )}
    </div>
  );
}