import { useEffect, useLayoutEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useImageGuardProps } from '@/hooks/useDownloadPermissions';
import { BirthdayAvatarCrown } from '@/components/profile/BirthdayAvatarCrown';
import { useIsBirthday } from '@/hooks/useBirthday';
import { useAuth } from '@/contexts/AuthContext';




interface UserAvatarImageProps {
  src?: string | null;
  alt?: string;
  fallback?: ReactNode;
  className?: string;
  fallbackClassName?: string;
  imgClassName?: string;
  disableSkeleton?: boolean;
  loading?: ImgHTMLAttributes<HTMLImageElement>['loading'];
  decoding?: ImgHTMLAttributes<HTMLImageElement>['decoding'];
  ownerId?: string | null;
  /** Show golden birthday ring + gift icon when it's this user's public birthday. Default true. */
  showBirthdayCrown?: boolean;
}

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
  showBirthdayCrown = true,
}: UserAvatarImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const guard = useImageGuardProps(ownerId);
  const isBirthday = useIsBirthday(ownerId ?? null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [avatarPx, setAvatarPx] = useState<number>(40);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const w = el.clientWidth;
      if (w > 0) setAvatarPx(w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);


  const showImage = !!src && !errored;

  return (
    <div
      ref={wrapperRef}
      className={cn(
        'relative flex shrink-0 overflow-visible rounded-full bg-muted',
        className
      )}
      onContextMenu={guard.onContextMenu}
    >

      <div className="absolute inset-0 overflow-hidden rounded-full">
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
      {showBirthdayCrown && (isBirthday || showOwnBirthdayPreview) && (
        <BirthdayAvatarCrown avatarSizePx={avatarPx} />
      )}

    </div>

  );
}

