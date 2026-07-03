import { useMemo } from 'react';
import { detectProvider } from './providers';
import { YouTubeEmbed } from './YouTubeEmbed';
import { TwitchEmbed } from './TwitchEmbed';
import { LinkEmbed, LinkEmbeds as FallbackLinkEmbeds } from '@/components/chat/LinkEmbed';
import { extractUrls } from '@/hooks/useUrlMetadata';

interface SmartLinkEmbedProps {
  url: string;
}

export function SmartLinkEmbed({ url }: SmartLinkEmbedProps) {
  const detected = useMemo(() => detectProvider(url), [url]);
  if (detected?.provider === 'youtube') {
    return <YouTubeEmbed parsed={detected.parsed} originalUrl={url} />;
  }
  if (detected?.provider === 'twitch') {
    return <TwitchEmbed parsed={detected.parsed} originalUrl={url} />;
  }
  return <LinkEmbed url={url} />;
}

interface SmartLinkEmbedsProps {
  content: string;
}

export function SmartLinkEmbeds({ content }: SmartLinkEmbedsProps) {
  const urls = useMemo(() => extractUrls(content), [content]);
  const themes = useMemo(() => extractThemesFromContent(content), [content]);
  if (urls.length === 0 && themes.length === 0) return null;
  return (
    <div className="space-y-1">
      {urls.map((url) => (
        <SmartLinkEmbed key={url} url={url} />
      ))}
      {themes.length > 0 && <ThemeCardEmbeds content={content} />}
    </div>
  );
}

// Re-export fallback for backward compat if needed
export { FallbackLinkEmbeds };
