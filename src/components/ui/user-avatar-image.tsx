import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

/**
 * Reusable user avatar with skeleton placeholder while loading.
 * Prevents the "initials flash then real avatar" jank on cold cache loads.
 *
 * Mirrors the pattern from ServerIconImage but for circular user avatars.
 */
interface UserAvatarImageProps {
  src?: string | null;
  alt?: string;
  fallback: string;
  className?: string;
  fallbackClassName?: string;
}

export function UserAvatarImage({
  src,
  alt,
  fallback,
  className,
  fallbackClassName,
}: UserAvatarImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // Reset loading state when src changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const showImage = !!src && !errored;
  const showSkeleton = showImage && !loaded;

  return (
    <Avatar className={cn('relative', className)}>
      {showSkeleton && (
        <div className="absolute inset-0 animate-pulse bg-muted/40 rounded-full z-10" />
      )}
      {showImage ? (
        <img
          src={src}
          alt={alt ?? ''}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'aspect-square h-full w-full object-cover transition-opacity duration-150',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      ) : (
        <AvatarFallback className={fallbackClassName}>{fallback}</AvatarFallback>
      )}
    </Avatar>
  );
}
