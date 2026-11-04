import { useState } from 'react';
import { ServerBadgeIcon } from '@/components/icons/ServerBadgeIcon';
import { bannerPresetCss } from '@/lib/bannerPresets';
import { cn } from '@/lib/utils';

import { appLocale } from '@/i18n/locale';
/*
 * Carte de presentation du serveur (Guide du serveur, Profil du serveur) :
 * banniere, icone en squircle, nom + badge Communaute, "N en ligne",
 * "N membres", "depuis <mois annee>".
 */
export interface ServerPreviewCardProps {
  name: string;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  bannerPreset?: string | null;
  community?: boolean;
  onlineCount: number;
  memberCount: number;
  createdAt?: string | null;
  traits?: { emoji?: string; label: string }[];
  className?: string;
}

function serverInitials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

export function ServerPreviewCard({ name, iconUrl, bannerUrl, bannerPreset, community, onlineCount, memberCount, createdAt, traits, className }: ServerPreviewCardProps) {
  const [iconFailed, setIconFailed] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);
  const since = createdAt ? new Date(createdAt).toLocaleDateString(appLocale(), { month: 'short', year: 'numeric' }) : null;
  return (
    <div className={cn('rounded-2xl overflow-hidden bg-[hsl(var(--surface-card))] border border-[hsl(var(--border-subtle))]', className)}>
      <div className="h-[110px] bg-cover bg-center" style={{ backgroundImage: bannerUrl && !bannerFailed ? undefined : bannerPresetCss(bannerPreset) }}>
        {bannerUrl && !bannerFailed && <img src={bannerUrl} alt="" className="w-full h-full object-cover" onError={() => setBannerFailed(true)} />}
      </div>
      <div className="px-4 pb-4">
        <div className="-mt-9 w-[66px] h-[66px] rounded-[20px] ring-4 ring-[hsl(var(--surface-card))] bg-[hsl(var(--card))] overflow-hidden flex items-center justify-center text-base font-semibold text-white">
          {iconUrl && !iconFailed ? <img src={iconUrl} alt="" className="w-full h-full object-cover" onError={() => setIconFailed(true)} /> : serverInitials(name)}
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-base font-bold text-white min-w-0">
          <span className="truncate">{name}</span>
          {community && <ServerBadgeIcon className="w-4 h-4" />}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-[hsl(var(--invite-text))]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--online))]" />{onlineCount} en ligne</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--offline))]" />{memberCount} membre{memberCount > 1 ? 's' : ''}</span>
        </p>
        {since && <p className="text-sm text-[hsl(var(--invite-text))]">depuis {since}</p>}
        {traits && traits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {traits.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1 h-6 px-2 rounded-md border border-[hsl(var(--border-subtle))] text-xs text-[hsl(var(--invite-text))]">
                {t.emoji && <span>{t.emoji}</span>}
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
