'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface OptimizedImageProps {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Width in pixels (for fixed-size images) */
  width?: number;
  /** Height in pixels (for fixed-size images) */
  height?: number;
  /** Whether to fill the parent container */
  fill?: boolean;
  /** CSS object-fit property */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Responsive sizes for srcset - IMPORTANT for high-DPI displays */
  sizes?: string;
  /** Priority loading (above-the-fold images) */
  priority?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Wrapper class for the container */
  wrapperClassName?: string;
  /** Show loading skeleton */
  showSkeleton?: boolean;
  /** Show fallback on error */
  showFallback?: boolean;
  /** Quality (1-100, default 75) */
  quality?: number;
  /** Border radius preset */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  /** Aspect ratio for responsive sizing */
  aspectRatio?: 'square' | 'video' | 'portrait' | 'auto';
}

/**
 * Optimized image component for high-DPI displays (2x, 3x Retina)
 *
 * Features:
 * - Automatic srcset generation for 1x, 2x, 3x displays
 * - WebP/AVIF format serving (via Next.js)
 * - Lazy loading with blur placeholder
 * - Error handling with fallback
 * - Loading skeleton state
 *
 * Usage for different scenarios:
 *
 * 1. Fixed-size image (avatar, thumbnail):
 *    <OptimizedImage src="..." alt="..." width={64} height={64} />
 *
 * 2. Responsive fill image:
 *    <OptimizedImage src="..." alt="..." fill sizes="(max-width: 768px) 100vw, 50vw" />
 *
 * 3. Full-width hero image:
 *    <OptimizedImage src="..." alt="..." fill priority sizes="100vw" />
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  objectFit = 'cover',
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  priority = false,
  className = '',
  wrapperClassName = '',
  showSkeleton = true,
  showFallback = true,
  quality = 75,
  rounded = 'none',
  aspectRatio = 'auto',
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const roundedClasses = {
    none: '',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };

  const aspectRatioClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  // Handle load complete
  const handleLoad = () => {
    setIsLoading(false);
  };

  // Handle error
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // If error and fallback enabled, show placeholder
  if (hasError && showFallback) {
    return (
      <div
        className={`
          flex items-center justify-center
          bg-gray-100 dark:bg-gray-800
          ${roundedClasses[rounded]}
          ${aspectRatioClasses[aspectRatio]}
          ${wrapperClassName}
        `}
        style={!fill && width && height ? { width, height } : undefined}
      >
        <ImageOff className="w-1/4 h-1/4 text-gray-400 dark:text-gray-600" />
      </div>
    );
  }

  // For data URLs or blob URLs, use regular img tag
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        className={`
          ${fill ? 'w-full h-full' : ''}
          ${roundedClasses[rounded]}
          ${className}
        `}
        style={{
          objectFit,
          ...(width && height && !fill ? { width, height } : {}),
        }}
        onLoad={handleLoad}
        onError={handleError}
      />
    );
  }

  // Use Next.js Image for URL sources with high-DPI support
  return (
    <div
      className={`
        relative overflow-hidden
        ${aspectRatioClasses[aspectRatio]}
        ${roundedClasses[rounded]}
        ${wrapperClassName}
      `}
      style={!fill && width && height ? { width, height } : undefined}
    >
      {/* Loading skeleton */}
      {showSkeleton && isLoading && (
        <div
          className={`
            absolute inset-0
            bg-gray-200 dark:bg-gray-700
            animate-pulse
            ${roundedClasses[rounded]}
          `}
        />
      )}

      {/* Next.js Image with srcset for high-DPI */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        priority={priority}
        quality={quality}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${className}
        `}
        style={{ objectFit }}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
}

/**
 * Preset components for common use cases
 */

// Avatar image (circular, fixed size)
export function AvatarImage({
  src,
  alt,
  size = 40,
  className = '',
}: {
  src: string;
  alt: string;
  size?: 24 | 32 | 40 | 48 | 64 | 80 | 96;
  className?: string;
}) {
  // For avatars, we want 2x resolution for Retina displays
  // So a 40px avatar should request up to 80px image
  const sizes = `${size * 2}px`;

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      sizes={sizes}
      rounded="full"
      className={className}
      quality={85}
    />
  );
}

// Card thumbnail (responsive, maintains aspect)
export function ThumbnailImage({
  src,
  alt,
  aspectRatio = 'video',
  priority = false,
  className = '',
}: {
  src: string;
  alt: string;
  aspectRatio?: 'square' | 'video' | 'portrait';
  priority?: boolean;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      aspectRatio={aspectRatio}
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      priority={priority}
      rounded="lg"
      className={className}
    />
  );
}

// Hero/banner image (full width, high quality)
export function HeroImage({
  src,
  alt,
  className = '',
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      fill
      sizes="100vw"
      priority
      quality={85}
      className={className}
    />
  );
}

export default OptimizedImage;
