'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';

interface OptimizedVideoProps {
  /** Video source URL */
  src: string;
  /** Poster image URL (thumbnail) */
  poster?: string;
  /** Alt text for accessibility */
  alt?: string;
  /** Whether video should autoplay (muted required) */
  autoPlay?: boolean;
  /** Whether video should loop */
  loop?: boolean;
  /** Whether video should be muted */
  muted?: boolean;
  /** Show video controls */
  controls?: boolean;
  /** Preload strategy */
  preload?: 'none' | 'metadata' | 'auto';
  /** Additional CSS classes */
  className?: string;
  /** Aspect ratio */
  aspectRatio?: 'video' | 'square' | 'portrait';
  /** Border radius */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  /** Show custom play button overlay */
  showPlayButton?: boolean;
  /** Duration in seconds (for display) */
  duration?: number;
  /** Callback when video starts playing */
  onPlay?: () => void;
  /** Callback when video pauses */
  onPause?: () => void;
  /** Callback when video ends */
  onEnded?: () => void;
}

/**
 * Optimized video component for mobile performance.
 *
 * Features:
 * - preload="metadata" by default (only loads video metadata, not full video)
 * - Lazy loading via Intersection Observer
 * - Touch-friendly controls
 * - Poster image support
 * - Responsive sizing
 *
 * Best practices:
 * - Always provide a poster image for faster perceived load
 * - Use preload="metadata" to avoid auto-downloading full video
 * - Use preload="none" for below-the-fold videos
 */
export function OptimizedVideo({
  src,
  poster,
  alt = 'Video',
  autoPlay = false,
  loop = false,
  muted = false,
  controls = false,
  preload = 'metadata',
  className = '',
  aspectRatio = 'video',
  rounded = 'lg',
  showPlayButton = true,
  duration,
  onPlay,
  onPause,
  onEnded,
}: OptimizedVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted || autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Lazy load video when it enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Play/pause toggle
  const handlePlayPause = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  }, [isPlaying]);

  // Mute toggle
  const handleMuteToggle = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);

  // Fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    if (!containerRef.current) return;

    if (isFullscreen) {
      document.exitFullscreen?.();
    } else {
      containerRef.current.requestFullscreen?.();
    }
  }, [isFullscreen]);

  // Video event handlers
  const handlePlay = useCallback(() => {
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onEnded?.();
  }, [onEnded]);

  const handleLoadedMetadata = useCallback(() => {
    setHasLoaded(true);
  }, []);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const aspectRatioClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[9/16]',
  };

  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  };

  return (
    <div
      ref={containerRef}
      className={`
        relative overflow-hidden bg-gray-900
        ${aspectRatioClasses[aspectRatio]}
        ${roundedClasses[rounded]}
        ${className}
      `}
    >
      {/* Video element - only render when in view */}
      {isInView && (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          autoPlay={autoPlay}
          loop={loop}
          muted={isMuted}
          playsInline
          preload={preload}
          controls={controls && !showPlayButton}
          className="w-full h-full object-cover"
          onPlay={handlePlay}
          onPause={handlePause}
          onEnded={handleEnded}
          onLoadedMetadata={handleLoadedMetadata}
          aria-label={alt}
        />
      )}

      {/* Poster placeholder before video loads */}
      {!isInView && poster && (
        <img
          src={poster}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}

      {/* Custom controls overlay */}
      {showPlayButton && !controls && (
        <div
          className={`
            absolute inset-0 flex items-center justify-center
            transition-opacity duration-300
            ${isPlaying ? 'opacity-0 hover:opacity-100' : 'opacity-100'}
          `}
        >
          {/* Play/Pause button */}
          <button
            onClick={handlePlayPause}
            className="
              p-4 bg-black/60 text-white rounded-full
              hover:bg-black/80 hover:scale-110
              transition-all duration-200
              touch-manipulation
              min-w-[56px] min-h-[56px]
              flex items-center justify-center
            "
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-8 h-8" />
            ) : (
              <Play className="w-8 h-8 ml-1" />
            )}
          </button>

          {/* Bottom controls */}
          {hasLoaded && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
              <div className="flex items-center justify-between gap-3">
                {/* Duration */}
                {duration && (
                  <span className="text-white text-sm font-medium">
                    {formatDuration(duration)}
                  </span>
                )}

                <div className="flex items-center gap-2">
                  {/* Mute button */}
                  <button
                    onClick={handleMuteToggle}
                    className="
                      p-2 text-white rounded-full
                      hover:bg-white/20
                      transition-colors
                      touch-manipulation
                    "
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? (
                      <VolumeX className="w-5 h-5" />
                    ) : (
                      <Volume2 className="w-5 h-5" />
                    )}
                  </button>

                  {/* Fullscreen button */}
                  <button
                    onClick={handleFullscreenToggle}
                    className="
                      p-2 text-white rounded-full
                      hover:bg-white/20
                      transition-colors
                      touch-manipulation
                    "
                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? (
                      <Minimize2 className="w-5 h-5" />
                    ) : (
                      <Maximize2 className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Optimized audio player component.
 * Uses preload="metadata" for faster initial load.
 */
export function OptimizedAudio({
  src,
  title = 'Audio',
  duration,
  className = '',
  onPlay,
  onPause,
  onEnded,
}: {
  src: string;
  title?: string;
  duration?: number;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, [isPlaying]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-xl ${className}`}>
      <button
        onClick={handlePlayPause}
        className="
          p-3 bg-purple-500 hover:bg-purple-600 text-white rounded-full
          transition-colors flex-shrink-0
          min-w-[48px] min-h-[48px]
          flex items-center justify-center
          touch-manipulation
        "
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {title}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}
        </p>
      </div>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => {
          setIsPlaying(true);
          onPlay?.();
        }}
        onPause={() => {
          setIsPlaying(false);
          onPause?.();
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          onEnded?.();
        }}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        className="hidden"
      />
    </div>
  );
}

export default OptimizedVideo;
