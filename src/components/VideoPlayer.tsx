import { X, AlertCircle, Play, Pause, Volume2, VolumeX, Maximize, RotateCcw, Loader2, Settings, Languages, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
const SKIP_DURATION = 10; // seconds

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
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const containerRef = useRef<HTMLDivElement>(null);
  const retryCountRef = useRef(0);

  // Memoized video sources with better fallbacks
  const videoSources = useMemo(() => [
    `https://autoembed.co/movie/tmdb/${movieId}`,
    `https://player.smashy.stream/movie/${movieId}`,
    `https://embed.su/embed/movie/${movieId}`,
    `https://vidsrc.xyz/embed/movie?tmdb=${movieId}`,
    `https://2embed.org/embed/movie?tmdb=${movieId}`,
    `https://www.2embed.to/embed/tmdb/movie?id=${movieId}`,
  ], [movieId]);

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Enhanced error handling
  const handleError = useCallback((error: any, sourceIndex: number) => {
    console.error(`Video error on source ${sourceIndex + 1}:`, error);
    
    if (sourceIndex < videoSources.length - 1) {
      setCurrentSource(sourceIndex + 1);
      setErrorMessage(`Source ${sourceIndex + 1} failed, trying next...`);
    } else {
      setHasError(true);
      setIsLoading(false);
      setErrorMessage('All video sources failed to load. Please try again later.');
    }
  }, [videoSources.length]);

  // Initialize Video.js player with better configuration
  useEffect(() => {
    if (!isOpen || !videoRef.current) return;

    const player = videojs(videoRef.current, {
      controls: false,
      fluid: true,
      responsive: true,
      preload: 'metadata',
      techOrder: ['html5'],
      html5: {
        hls: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true,
          withCredentials: false,
        }
      },
      playsinline: true,
      crossOrigin: 'anonymous',
    });

    playerRef.current = player;

    const trySource = (sourceIndex: number) => {
      if (sourceIndex >= videoSources.length) {
        handleError(new Error('All sources exhausted'), sourceIndex);
        return;
      }

      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');

      player.src({
        src: videoSources[sourceIndex],
        type: 'application/x-mpegURL'
      });

      // Enhanced event listeners
      const onReady = () => {
        setIsLoading(false);
        
        // Setup quality levels
        if ((player as any).qualityLevels) {
          const levels = (player as any).qualityLevels();
          const levelArray: QualityLevel[] = [];
          for (let i = 0; i < levels.length; i++) {
            levelArray.push({
              index: i,
              label: `${levels[i].height}p`,
              height: levels[i].height,
              width: levels[i].width,
              bandwidth: levels[i].bandwidth
            });
          }
          // Sort by quality (highest first)
          levelArray.sort((a, b) => b.height - a.height);
          setQualityLevels(levelArray);
        }

        // Setup subtitle tracks
        const tracks = player.textTracks();
        const trackArray: SubtitleTrack[] = [];
        for (let i = 0; i < (tracks as any).length; i++) {
          const track = tracks[i];
          if (track.kind === 'subtitles' || track.kind === 'captions') {
            trackArray.push({
              index: i,
              label: track.label || track.language || `Track ${i + 1}`,
              language: track.language || 'unknown'
            });
          }
        }
        setSubtitleTracks(trackArray);
      };

      const onError = () => {
        retryCountRef.current++;
        if (retryCountRef.current < 3) {
          setTimeout(() => trySource(sourceIndex), 1000 * retryCountRef.current);
        } else {
          handleError(new Error('Max retries exceeded'), sourceIndex);
          retryCountRef.current = 0;
        }
      };

      const onLoadedData = () => {
        setHasError(false);
        setIsLoading(false);
        setDuration(player.duration() || 0);
        retryCountRef.current = 0;
      };

      // Remove previous listeners
      player.off('ready');
      player.off('error');
      player.off('loadeddata');
      player.off('waiting');
      player.off('canplay');

      // Add new listeners
      player.one('ready', onReady);
      player.one('error', onError);
      player.one('loadeddata', onLoadedData);
      
      player.on('waiting', () => setIsBuffering(true));
      player.on('canplay', () => setIsBuffering(false));
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
      player.on('ratechange', () => {
        setPlaybackRate(player.playbackRate());
      });
    };

    trySource(currentSource);

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [isOpen, movieId, currentSource, videoSources, handleError]);

  // Enhanced controls visibility management
  const hideControlsTimeout = useCallback(() => {
    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!showSettings && isPlaying) {
        setShowControls(false);
      }
    }, CONTROLS_HIDE_DELAY);
  }, [showSettings, isPlaying]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    hideControlsTimeout();
  }, [hideControlsTimeout]);

  useEffect(() => {
    const handleMouseMove = () => showControlsTemporarily();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
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
  }, [isOpen, showSettings, isPlaying]);

  // Enhanced player controls
  const togglePlay = useCallback(() => {
    if (playerRef.current) {
      if (playerRef.current.paused()) {
        playerRef.current.play().catch(console.error);
      } else {
        playerRef.current.pause();
      }
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.muted(!playerRef.current.muted());
    }
  }, []);

  const adjustVolume = useCallback((delta: number) => {
    if (playerRef.current) {
      const newVolume = Math.max(0, Math.min(1, playerRef.current.volume() + delta));
      playerRef.current.volume(newVolume);
    }
  }, []);

  const handleVolumeChange = useCallback((value: number[]) => {
    if (playerRef.current) {
      playerRef.current.volume(value[0]);
      if (value[0] > 0 && playerRef.current.muted()) {
        playerRef.current.muted(false);
      }
    }
  }, []);

  const skipForward = useCallback(() => {
    if (playerRef.current) {
      const newTime = Math.min(duration, (playerRef.current.currentTime() || 0) + SKIP_DURATION);
      playerRef.current.currentTime(newTime);
    }
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (playerRef.current) {
      const newTime = Math.max(0, (playerRef.current.currentTime() || 0) - SKIP_DURATION);
      playerRef.current.currentTime(newTime);
    }
  }, []);

  const handleProgressChange = useCallback((value: number[]) => {
    if (playerRef.current) {
      playerRef.current.currentTime(value[0]);
      setProgress(value[0]);
    }
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (playerRef.current) {
      if (playerRef.current.isFullscreen()) {
        playerRef.current.exitFullscreen();
      } else {
        playerRef.current.requestFullscreen();
      }
    }
  }, []);

  const handleQualityChange = useCallback((quality: string) => {
    if (playerRef.current && (playerRef.current as any).qualityLevels) {
      const levels = (playerRef.current as any).qualityLevels();
      
      if (quality === 'auto') {
        for (let i = 0; i < levels.length; i++) {
          levels[i].enabled = true;
        }
      } else {
        const selectedHeight = parseInt(quality.replace('p', ''));
        for (let i = 0; i < levels.length; i++) {
          levels[i].enabled = levels[i].height === selectedHeight;
        }
      }
      setCurrentQuality(quality);
    }
  }, []);

  const handleSubtitleChange = useCallback((subtitle: string) => {
    if (playerRef.current) {
      const tracks = playerRef.current.textTracks();
      
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
  }, []);

  const handlePlaybackRateChange = useCallback((rate: string) => {
    if (playerRef.current) {
      const rateValue = parseFloat(rate);
      playerRef.current.playbackRate(rateValue);
      setPlaybackRate(rateValue);
    }
  }, []);

  const resetPlayer = useCallback(() => {
    setCurrentSource(0);
    setHasError(false);
    setErrorMessage('');
    setIsLoading(true);
    retryCountRef.current = 0;
  }, []);

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
            {errorMessage || `Loading source ${currentSource + 1} of ${videoSources.length}`}
          </p>
          {currentSource > 0 && (
            <p className="text-gray-400 text-sm mt-2">
              Previous sources failed, trying alternatives...
            </p>
          )}
        </div>
      )}

      {/* Buffering Indicator */}
      {isBuffering && !isLoading && (
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
            {/* Video.js Player */}
            <video
              ref={videoRef}
              className="video-js vjs-default-skin w-full h-full"
              data-setup="{}"
              playsInline
              onClick={showControlsTemporarily}
            />
            
            {/* Custom Video Controls Overlay */}
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

            {/* Enhanced Settings Panel */}
            {showSettings && (
              <div className="absolute right-4 bottom-24 bg-black/95 backdrop-blur-md text-white p-6 rounded-lg min-w-[250px] border border-white/10 shadow-2xl">
                <div className="space-y-6">
                  {/* Quality Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3 text-gray-200">Video Quality</label>
                    <Select value={currentQuality} onValueChange={handleQualityChange}>
                      <SelectTrigger className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/20 backdrop-blur-md">
                        <SelectItem value="auto" className="text-white hover:bg-white/20">
                          Auto (Recommended)
                        </SelectItem>
                        {qualityLevels.map((level) => (
                          <SelectItem key={level.index} value={level.label} className="text-white hover:bg-white/20">
                            {level.label} ({Math.round(level.bandwidth / 1000)}k)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

                  {/* Subtitle Selection */}
                  <div>
                    <label className="block text-sm font-medium mb-3 flex items-center gap-2 text-gray-200">
                      <Languages className="w-4 h-4" />
                      Subtitles
                    </label>
                    <Select value={currentSubtitle} onValueChange={handleSubtitleChange}>
                      <SelectTrigger className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 transition-colors">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-black/95 border-white/20 backdrop-blur-md">
                        <SelectItem value="off" className="text-white hover:bg-white/20">
                          Off
                        </SelectItem>
                        {subtitleTracks.map((track) => (
                          <SelectItem key={track.index} value={track.index.toString()} className="text-white hover:bg-white/20">
                            {track.label} {track.language && `(${track.language})`}
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
                Source {currentSource + 1}/{videoSources.length}
              </div>
              
              {/* Quality Indicator */}
              {currentQuality !== 'auto' && (
                <div className="bg-black/70 text-white text-xs px-3 py-1 rounded-full backdrop-blur-sm">
                  {currentQuality}
                </div>
              )}

              {/* Live Indicator for HLS streams */}
              {duration === Infinity && (
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

            {/* Click to play overlay when paused */}
            {!isPlaying && !isLoading && !hasError && (
              <div 
                className="absolute inset-0 flex items-center justify-center cursor-pointer group"
                onClick={togglePlay}
              >
                <div className="bg-black/50 rounded-full p-6 group-hover:bg-black/70 transition-colors group-hover:scale-110 transform duration-200">
                  <Play className="w-16 h-16 text-white" />
                </div>
              </div>
            )}

            {/* Picture-in-Picture Button (if supported) */}
            {document.pictureInPictureEnabled && (
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

            {/* Mini Player Controls (when controls are hidden) */}
            {!showControls && isPlaying && (
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

            {/* Error Recovery Toast */}
            {currentSource > 0 && !hasError && !isLoading && (
              <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-yellow-600/90 text-white px-4 py-2 rounded-lg backdrop-blur-sm text-sm">
                Switched to backup source {currentSource + 1}
              </div>
            )}

            {/* Network Status Indicator */}
            {navigator.onLine === false && (
              <div className="absolute top-20 right-4 bg-red-600/90 text-white px-3 py-2 rounded-lg backdrop-blur-sm text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                No Internet Connection
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

// Additional CSS that should be added to your global styles or component styles
const additionalStyles = `
  /* Custom Video.js styling */
  .video-js {
    font-family: inherit;
  }

  .video-js .vjs-big-play-button {
    display: none !important;
  }

  .video-js .vjs-control-bar {
    display: none !important;
  }

  .video-js .vjs-loading-spinner {
    display: none !important;
  }

  .video-js .vjs-poster {
    background-size: cover;
    background-position: center;
  }

  /* Custom slider styling */
  .slider-root {
    position: relative;
    display: flex;
    align-items: center;
    user-select: none;
    touch-action: none;
  }

  .slider-track {
    background-color: rgba(255, 255, 255, 0.3);
    position: relative;
    flex-grow: 1;
    border-radius: 9999px;
    height: 4px;
  }

  .slider-range {
    position: absolute;
    background-color: white;
    border-radius: 9999px;
    height: 100%;
  }

  .slider-thumb {
    display: block;
    width: 16px;
    height: 16px;
    background-color: white;
    border-radius: 50%;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    transition: transform 0.2s;
  }

  .slider-thumb:hover {
    transform: scale(1.2);
  }

  .slider-thumb:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
  }

  /* Mobile optimizations */
  @media (max-width: 768px) {
    .video-controls {
      padding: 1rem;
    }
    
    .video-controls .control-button {
      min-width: 44px;
      min-height: 44px;
    }
    
    .settings-panel {
      right: 1rem;
      left: 1rem;
      bottom: 6rem;
      min-width: auto;
    }
  }

  /* Accessibility improvements */
  @media (prefers-reduced-motion: reduce) {
    .video-player * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .video-controls {
      background: black !important;
      border: 2px solid white;
    }
    
    .control-button {
      border: 1px solid white !important;
    }
  }

  /* Focus indicators for keyboard navigation */
  .control-button:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
  }

  /* Custom scrollbar for settings panel */
  .settings-panel::-webkit-scrollbar {
    width: 6px;
  }

  .settings-panel::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }

  .settings-panel::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 3px;
  }

  .settings-panel::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.5);
  }
`;

export default VideoPlayer;
