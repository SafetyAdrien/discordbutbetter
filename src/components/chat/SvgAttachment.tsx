import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { sanitizeSvg, svgBlobUrl, isSvgMarkup } from '@/lib/svg';
import { useImageGuardProps, useCanDownload } from '@/hooks/useDownloadPermissions';
import { Download } from '@/components/icons/discord/lucide';

interface SvgAttachmentProps {
  url: string;
  name: string;
  description?: string;
  isSpoiler?: boolean;
  size?: number;
  authorId?: string | null;
  onOpen?: () => void;
}

/**
 * Renders an SVG attachment safely.
 *
 * The file is fetched and sanitized, then displayed inside a sandboxed iframe
 * pointing at a blob URL. Using <img> would be simpler, but it gives no control
 * over scripted content on some browsers, and an iframe with a restrictive
 * sandbox keeps the document inert even if sanitization misses something.
 */
export function SvgAttachment({
  url,
  name,
  description,
  isSpoiler,
  size,
  authorId,
  onOpen,
}: SvgAttachmentProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const guard = useImageGuardProps(authorId);
  const { canDownload, isLoading } = useCanDownload(authorId);
  const revokedRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        if (!isSvgMarkup(text)) throw new Error('Not an SVG document');
        if (cancelled) return;

        // Revoke any previous object URL before allocating a new one.
        if (revokedRef.current) URL.revokeObjectURL(revokedRef.current);

        const next = svgBlobUrl(sanitizeSvg(text));
        revokedRef.current = next;
        setObjectUrl(next);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (revokedRef.current) {
        URL.revokeObjectURL(revokedRef.current);
        revokedRef.current = null;
      }
    };
  }, [url]);

  if (failed) {
    return (
      <div className="flex items-center gap-3 bg-surface-hover rounded-lg p-3 max-w-sm">
        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4h16v16H4z" />
            <path d="m4 16 5-5 4 4 3-3 4 4" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{name}</p>
          <p className="text-xs text-muted-foreground">
            Aperçu indisponible
            {size ? ` — ${(size / 1024).toFixed(1)} KB` : ''}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group inline-block max-w-full">
      <div
        className={cn(
          'relative overflow-hidden rounded-lg bg-[hsl(var(--surface-2))]',
          isSpoiler && 'blur-2xl brightness-50',
        )}
        onClick={onOpen}
      >
        {objectUrl ? (
          <iframe
            // The sandbox denies scripts entirely and restricts the document to
            // its own origin, so sanitized markup cannot reach the app.
            sandbox=""
            src={objectUrl}
            title={description || name}
            className="w-full max-w-full max-h-96 border-0"
            style={{ aspectRatio: '4 / 3', minHeight: 96 }}
            {...guard}
          />
        ) : (
          <div className="w-64 h-48 animate-pulse bg-muted/30" />
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1 truncate">{name}</p>
      {canDownload && !isLoading && (
        <a
          href={url}
          download={name}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-2 right-2 p-1.5 rounded-md bg-background/80 hover:bg-background transition-colors opacity-0 group-hover:opacity-100"
          aria-label={`Télécharger ${name}`}
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </a>
      )}
    </div>
  );
}