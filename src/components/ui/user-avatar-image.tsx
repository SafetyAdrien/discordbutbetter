import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface UserAvatarImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  src?: string | null;
  alt?: string;
  fallback?: React.ReactNode;
  /** Tailwind classes applied to the outer wrapper (sizing, rounding). */
  className?: string;
  /** Classes applied specifically to the fallback container. */
  fallbackClassName?: string;
  /** Disable the skeleton pulse while loading. */
  disableSkeleton?: boolean;
}

/**
 * Drop-in replacement for raw <AvatarImage>: shows a skeleton pulse during
 * loading and falls back to children (initials/icon) on error or when no src.
 *
 * Mirrors the ServerIconImage pattern to eliminate first-paint flicker on
 * user avatars across the app.
 */
export function UserAvatarImage({
  src,
  alt,
  fallback,
  className,
  fallbackClassName,
  disableSkeleton = false,
  ...imgProps
}: UserAvatarImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const showImage = !!src && !errored;

  return (
    <div
      className={cn(
        'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
        className
      )}
    >
      {showImage && !loaded && !disableSkeleton && (
        <div className="absolute inset-0 animate-pulse bg-muted/60" />
      )}
      {showImage ? (
        <img
          {...imgProps}
          src={src ?? undefined}
          alt={alt ?? ''}
          loading={imgProps.loading ?? 'lazy'}
          decoding={imgProps.decoding ?? 'async'}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'aspect-square h-full w-full object-cover transition-opacity duration-150',
            loaded ? 'opacity-100' : 'opacity-0',
            imgProps.className
          )}
        />
      ) : (
        <div
          className={cn(
            'flex h-full w-full items-center justify-center bg-muted text-sm font-medium text-muted-foreground',
            fallbackClassName
          )}
        >
          {fallback}
        </div>
      )}
    </div>
  );
}
