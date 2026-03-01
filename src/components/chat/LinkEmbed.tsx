import { useUrlMetadata } from '@/hooks/useUrlMetadata';
import { Skeleton } from '@/components/ui/skeleton';

interface LinkEmbedProps {
  url: string;
}

export function LinkEmbed({ url }: LinkEmbedProps) {
  const { data, isLoading } = useUrlMetadata(url);

  if (isLoading) {
    return (
      <div className="flex gap-3 max-w-[520px] rounded bg-[hsl(228,6%,17%)] border-l-4 border-[hsl(235,86%,65%)] p-3 mt-1">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const borderColor = data.themeColor || '#5865F2';

  return (
    <div
      className="flex max-w-[520px] rounded bg-[hsl(228,6%,17%)] p-3 mt-1 gap-3"
      style={{ borderLeft: `4px solid ${borderColor}` }}
    >
      <div className="flex-1 min-w-0 space-y-1">
        {/* Site name */}
        {data.siteName && (
          <p className="text-xs text-muted-foreground font-medium truncate">
            {data.siteName}
          </p>
        )}

        {/* Title */}
        {data.title && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-[hsl(217,100%,70%)] hover:underline line-clamp-2 block"
          >
            {data.title}
          </a>
        )}

        {/* Description */}
        {data.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {data.description.length > 300
              ? data.description.slice(0, 300) + '…'
              : data.description}
          </p>
        )}
      </div>

      {/* Thumbnail */}
      {data.image && (
        <img
          src={data.image}
          alt=""
          className="w-20 h-20 rounded object-cover flex-shrink-0 self-center"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
    </div>
  );
}

interface LinkEmbedsProps {
  content: string;
}

export function LinkEmbeds({ content }: LinkEmbedsProps) {
  // Import here to avoid circular deps
  const { extractUrls } = require('@/hooks/useUrlMetadata');
  const urls = extractUrls(content);
  
  if (urls.length === 0) return null;
  
  return (
    <div className="space-y-1">
      {urls.map((url: string) => (
        <LinkEmbed key={url} url={url} />
      ))}
    </div>
  );
}
