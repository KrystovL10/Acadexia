import React, { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';

interface OptimizedAvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
} as const;

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const OptimizedAvatar = React.memo(function OptimizedAvatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  className,
}: OptimizedAvatarProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleLoad = useCallback(() => setImgLoaded(true), []);
  const handleError = useCallback(() => setImgError(true), []);

  const showImage = src && !imgError;
  const initials = getInitials(fallback || alt);

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-white',
        sizeClasses[size],
        className,
      )}
    >
      {/* Always render initials as base layer */}
      <span className={cn(showImage && imgLoaded && 'sr-only')}>
        {initials}
      </span>

      {/* Lazy-load image on top */}
      {showImage && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
          className={cn(
            'absolute inset-0 h-full w-full rounded-full object-cover transition-opacity duration-200',
            imgLoaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
});

export default OptimizedAvatar;
