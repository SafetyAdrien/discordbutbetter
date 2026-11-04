import { useState, useCallback, useMemo, KeyboardEvent } from 'react';
import { Play } from 'lucide-react';
import { Eye } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { TwitchParsed } from './providers';
import { useTwitchStatus } from '@/hooks/useTwitchStatus';

interface TwitchEmbedProps {
  parsed: TwitchParsed;
  originalUrl: string;
}

function compactNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, '')}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

export function TwitchEmbed({ parsed, originalUrl }: TwitchEmbedProps) {
  const [mounted, setMounted] = useState(false);
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

  // Only fetch live status for streams (channel pages).
  const { data: status, isLoading } = useTwitchStatus(parsed.kind === 'stream' ? parsed.value : null);

  const embedSrc = useMemo(() => {
    const parentParam = `parent=${encodeURIComponent(host)}`;
    if (parsed.kind === 'stream') {
      return `https://player.twitch.tv/?channel=${encodeURIComponent(parsed.value)}&${parentParam}&autoplay=true`;
    }
    if (parsed.kind === 'vod') {
      const t = parsed.start ? `&time=${parsed.start}s` : '';
      return `https://player.twitch.tv/?video=v${parsed.value}&${parentParam}&autoplay=true${t}`;
    }
    return `https://clips.twitch.tv/embed?clip=${encodeURIComponent(parsed.value)}&${parentParam}&autoplay=true`;
  }, [parsed, host]);

  const activate = useCallback(() => setMounted(true), []);
  const onKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
  }, [activate]);

  // Stream offline → render channel card, no player.
  if (parsed.kind === 'stream' && status && !status.isLive) {
    return (
      <div className="mt-1 w-full max-w-[520px] rounded-lg bg-[hsl(228,6%,17%)] border-l-4 border-[#9146ff] p-3 flex gap-3 items-center">
        {status.profileImage && (
          <img
            src={status.profileImage}
            alt=""
            className="w-12 h-12 rounded-full flex-shrink-0"
            loading="lazy"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Twitch</p>
          <a
            href={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[#9146ff] hover:underline block truncate"
          >
            {status.displayName || parsed.value}
          </a>
          <p className="text-xs text-muted-foreground">Hors ligne</p>
        </div>
      </div>
    );
  }

  if (parsed.kind === 'stream' && isLoading && !status) {
    return (
      <div className="mt-1 w-full max-w-[520px] aspect-video rounded-lg overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>
    );
  }

  const thumbnail =
    parsed.kind === 'stream' && status?.thumbnail
      ? status.thumbnail.replace('{width}', '640').replace('{height}', '360')
      : null;

  return (
    <div className="relative mt-1 w-full max-w-[520px] aspect-video overflow-hidden rounded-lg bg-black">
      {mounted ? (
        <iframe
          src={embedSrc}
          title="Twitch"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          loading="lazy"
        />
      ) : (
        <div
          role="button"
          tabIndex={0}
          aria-label="Lire le contenu Twitch"
          onClick={activate}
          onKeyDown={onKey}
          className={cn('group absolute inset-0 cursor-pointer')}
        >
          {thumbnail ? (
            <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#9146ff] to-[#5c16c5]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center group-hover:bg-[#9146ff] transition-colors">
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            </div>
          </div>
          {parsed.kind === 'stream' && status?.isLive && (
            <>
              <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-600 text-white text-xs font-bold uppercase tracking-wide">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Live
              </div>
              {typeof status.viewers === 'number' && (
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-black/70 text-white text-xs font-semibold">
                  <Eye className="w-3 h-3" />
                  {compactNumber(status.viewers)}
                </div>
              )}
            </>
          )}
          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 min-w-0">
            <span className="text-xs text-white font-bold flex-shrink-0">Twitch</span>
            {parsed.kind === 'stream' && status?.title && (
              <span className="text-xs text-white/90 truncate">{status.title}</span>
            )}
            {parsed.kind === 'clip' && <span className="text-xs text-white/80">Clip</span>}
            {parsed.kind === 'vod' && <span className="text-xs text-white/80">VOD</span>}
            <a
              href={originalUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto text-[10px] text-white/70 hover:text-white underline-offset-2 hover:underline flex-shrink-0"
            >
              Ouvrir
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
