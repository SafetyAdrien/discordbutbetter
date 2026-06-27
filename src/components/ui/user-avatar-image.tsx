import { useEffect, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useImageGuardProps } from '@/hooks/useDownloadPermissions';

interface UserAvatarImageProps {
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
  /** Tailwind classes applied to the outer wrapper (sizing, rounding). */
  className?: string;
  /** Classes applied specifically to the fallback container. */
  fallbackClassName?: string;
  /** Classes applied to the inner <img>. */
  imgClassName?: string;
  /** Disable the skeleton pulse while loading. */
  disableSkeleton?: boolean;
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
  decoding?: ImgHTMLAttributes<HTMLImageElement>['decoding'];
  /**
   * Identifier of the user this avatar belongs to. When provided and the
   * current viewer is not allowed to download this user's content,
   * right-click (Save image as...) and drag-and-drop saving are blocked.
   * Omit (or pass null) for the current user's own avatar.
   */
  ownerId?: string | null;
}

/**
 * Drop-in replacement for raw <AvatarImage>: shows a skeleton pulse during
 * loading and falls back to children (initials/icon) on error or when no src.
 * Also enforces download-permission gating (context menu + drag) when an
 * `ownerId` is provided.
 */
export function UserAvatarImage({
  src,
  alt,
  fallback,
  className,
  fallbackClassName,
  imgClassName,
  disableSkeleton = false,
  loading = 'lazy',
  decoding = 'async',
  ownerId,
}: UserAvatarImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const guard = useImageGuardProps(ownerId);

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
      onContextMenu={guard.onContextMenu}
    >
      {showImage && !loaded && !disableSkeleton && (
        <div className="absolute inset-0 animate-pulse bg-muted/60" />
      )}
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt ?? ''}
          loading={loading}
          decoding={decoding}
          draggable={false}
          onContextMenu={guard.onContextMenu}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={cn(
            'aspect-square h-full w-full object-cover transition-opacity duration-150',
            loaded ? 'opacity-100' : 'opacity-0',
            imgClassName
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
