import { useState, useCallback, KeyboardEvent } from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { YouTubeParsed } from './providers';

interface YouTubeEmbedProps {
  parsed: YouTubeParsed;
  originalUrl: string;
}

export function YouTubeEmbed({ parsed, originalUrl }: YouTubeEmbedProps) {
  const [mounted, setMounted] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const isShort = parsed.kind === 'short';

  const thumb = thumbError
    ? `https://i.ytimg.com/vi/${parsed.id}/hqdefault.jpg`
    : `https://i.ytimg.com/vi/${parsed.id}/maxresdefault.jpg`;

  const embedSrc =
    `https://www.youtube-nocookie.com/embed/${parsed.id}` +
    `?autoplay=1&rel=0&modestbranding=1&playsinline=1` +
    (parsed.start ? `&start=${parsed.start}` : '');

  const activate = useCallback(() => setMounted(true), []);
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      activate();
    }
  }, [activate]);

  const containerClass = cn(
    'relative mt-1 overflow-hidden rounded-lg bg-black',
    isShort ? 'w-full max-w-[280px] aspect-[9/16]' : 'w-full max-w-[520px] aspect-video'
  );

  return (
    <div className={containerClass}>
      {mounted ? (
        <iframe
          src={embedSrc}
          title="YouTube"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Lire la vidéo YouTube"
          onClick={activate}
          onKeyDown={onKey}
          className="group absolute inset-0 cursor-pointer"
        >
          <img
            src={thumb}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
            onError={() => setThumbError(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center group-hover:bg-[#ff0000] transition-colors">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
          {parsed.kind === 'live' && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold uppercase tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              Live
            </div>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
            <span className="text-xs text-white/90 font-medium truncate">
              {isShort ? 'YouTube Short' : 'YouTube'}
            </span>
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto text-[10px] text-white/70 hover:text-white underline-offset-2 hover:underline"
            >
              Ouvrir
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
