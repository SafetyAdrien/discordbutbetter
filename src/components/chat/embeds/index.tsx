import { useMemo } from 'react';
import { detectProvider } from './providers';
import { YouTubeEmbed } from './YouTubeEmbed';
import { TwitchEmbed } from './TwitchEmbed';
import { LinkEmbed, LinkEmbeds as FallbackLinkEmbeds } from '@/components/chat/LinkEmbed';
import { extractUrls } from '@/hooks/useUrlMetadata';
import { extractThemesFromContent } from '@/lib/customTheme/encode';
import { ThemeCardEmbeds } from './ThemeCardEmbed';
import { InviteEmbed } from './InviteEmbed';
import { extractInvites, isInviteUrl } from '@/lib/invites';
import { useUserSettingsValue } from '@/hooks/useUserSettings';

interface SmartLinkEmbedProps {
  url: string;
}

export function SmartLinkEmbed({ url }: SmartLinkEmbedProps) {
  const detected = useMemo(() => detectProvider(url), [url]);
  const { show_link_media: showLinkMedia, show_embeds: showEmbeds } = useUserSettingsValue().appearance;
  // Parametres > Apparence > Messages : medias des liens / integrations.
  if (detected && !showLinkMedia) return null;
  if (!detected && !showEmbeds) return null;
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
  // Les invitations ont leur propre carte : pas d'apercu de lien en double.
  const invites = useMemo(() => extractInvites(content), [content]);
  const urls = useMemo(() => extractUrls(content).filter((u) => !isInviteUrl(u)), [content]);
  const themes = useMemo(() => extractThemesFromContent(content), [content]);
  if (urls.length === 0 && themes.length === 0 && invites.length === 0) return null;
  return (
    <div className="space-y-1">
      {invites.map((invite) => (
        <InviteEmbed key={`${invite.source}:${invite.code}`} invite={invite} />
      ))}
      {urls.map((url) => (
        <SmartLinkEmbed key={url} url={url} />
      ))}
      {themes.length > 0 && <ThemeCardEmbeds content={content} />}
    </div>
  );
}

// Re-export fallback for backward compat if needed
export { FallbackLinkEmbeds };
