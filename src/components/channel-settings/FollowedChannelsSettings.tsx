import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from '@/components/icons/discord/lucide';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { useChannels } from '@/hooks/useChannels';
import { useFollowedChannels, useUnfollowChannel, useUpdateFollower, type FollowedSource } from '@/hooks/useChannelFollowers';
import { cn } from '@/lib/utils';

/*
 * Parametres du salon > Integrations > Salons suivis (video de reference) :
 * un bloc par salon d'annonces suivi ; deplie, on choisit le nom de
 * l'annonce (auteur des messages publies), le salon cible ("Poster sur") ou
 * on arrete de suivre.
 */

const fieldCls = 'w-full h-10 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground outline-none';

function FollowedRow({ f, channelOptions }: { f: FollowedSource; channelOptions: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const defaultName = f.source ? `${f.source.server_name} #${f.source.channel_name}` : 'Salon d\'annonces';
  const [name, setName] = useState(f.display_name ?? defaultName);
  useEffect(() => setName(f.display_name ?? defaultName), [f.display_name, defaultName]);
  const update = useUpdateFollower();
  const unfollow = useUnfollowChannel();

  const saveName = () => {
    const trimmed = name.trim();
    const next = !trimmed || trimmed === defaultName ? null : trimmed;
    if (next !== f.display_name) update.mutate({ id: f.id, patch: { display_name: next } });
  };

  return (
    <div className="rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-3 py-3 text-left">
        {f.source?.server_icon_url ? (
          <img src={f.source.server_icon_url} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <span className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-semibold">{defaultName.charAt(0)}</span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-base font-semibold text-white truncate">{f.display_name ?? defaultName}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <StreamlineMegaphone className="w-3.5 h-3.5" /> {f.source?.channel_name ?? '—'}
            <span className="ml-2">de {f.source?.server_name ?? 'serveur inconnu'}</span>
          </span>
        </span>
        {open ? <ChevronDown className="w-5 h-5 text-[hsl(var(--icon-default))]" /> : <ChevronRight className="w-5 h-5 text-[hsl(var(--icon-default))]" />}
      </button>
      {open && (
        <div className="px-3 pb-4 pt-1 border-t border-white/[0.06]">
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <label className="block mb-2 text-sm font-medium text-foreground">Nom de l'annonce</label>
              <input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} onBlur={saveName} onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} className={fieldCls} />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-foreground">Poster sur</label>
              <select
                value={f.target_channel_id}
                onChange={(e) => update.mutate({ id: f.id, patch: { target_channel_id: e.target.value } })}
                className={fieldCls}
              >
                {channelOptions.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
              </select>
            </div>
          </div>
          <button
            type="button"
            onClick={() => unfollow.mutate({ sourceChannelId: f.source_channel_id, targetChannelId: f.target_channel_id })}
            className={cn('mt-4 text-sm font-medium text-[#f57976] hover:underline', unfollow.isPending && 'opacity-50')}
          >
            Ne plus suivre
          </button>
        </div>
      )}
    </div>
  );
}

export function FollowedChannelsSettings({ channelId, serverId, channelName }: { channelId: string; serverId: string; channelName: string }) {
  const { data: followed = [], isLoading } = useFollowedChannels(channelId);
  const { data: channelsData } = useChannels(serverId);
  const channelOptions = channelsData
    ? [...channelsData.orphanChannels, ...channelsData.categories.flatMap((c) => c.channels)]
        .filter((c) => c.type === 'text' || c.type === 'announcement')
        .map((c) => ({ id: c.id, name: c.name }))
    : [];
  if (isLoading || followed.length === 0) return null;
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-white">Salons suivis</h3>
        <p className="mt-1 text-sm text-muted-foreground">Les mises à jour de ces salons des annonces seront envoyées directement sur ton serveur.</p>
      </div>
      <p className="text-sm font-medium text-foreground">Poste sur #{channelName}</p>
      {followed.map((f) => <FollowedRow key={f.id} f={f} channelOptions={channelOptions} />)}
    </section>
  );
}
