import { useMemo, useState } from 'react';
import { Search, X } from '@/components/icons/discord/lucide';
import { FavDialog, FAV_BTN_BLUE } from './FavDialog';
import { SourceTile, channelGlyph } from './FavIcons';
import { useAllServerAssets } from '@/hooks/useAllServerAssets';
import { useAllChannels } from '@/hooks/useAllChannels';
import { useDMConversations } from '@/hooks/useDMs';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { NewFavorite } from '@/hooks/useFavorites';

/*
 * "Ajouter aux favoris" (video de reference) : recherche (contour bleu), liste des salons de tous les serveurs et des MP
 * (nom en gras, serveur dessous, case a cocher), bouton "Ajouter aux favoris" (inactif tant que rien n'est coche).
 */

interface Row {
  key: string;
  name: string;
  sub: string;
  iconUrl: string | null;
  badge: React.ReactNode;
  fav: NewFavorite;
}

export function AddFavoritesDialog({ open, onOpenChange, onAdd, existing }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (items: NewFavorite[]) => void; existing: Set<string> }) {
  const { user } = useAuth();
  const { servers } = useAllServerAssets(open);
  const channels = useAllChannels(servers.map((s) => s.id), open).data ?? [];
  const { data: dms = [] } = useDMConversations();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const rows = useMemo<Row[]>(() => {
    const byServer = new Map(servers.map((s) => [s.id, s]));
    const out: Row[] = [];
    for (const c of channels) {
      const sv = byServer.get(c.server_id);
      out.push({
        key: `channel:${c.id}`,
        name: c.name,
        sub: sv?.name ?? '',
        iconUrl: sv?.icon_url ?? null,
        badge: channelGlyph(c.type),
        fav: { kind: 'channel', ref_id: c.id, server_id: c.server_id, channel_id: null, name: c.name, sub: sv?.name ?? null, icon_url: sv?.icon_url ?? null, ch_type: c.type },
      });
    }
    for (const d of dms) {
      const others = d.participants.filter((p) => p.id !== user?.id);
      const first = others[0];
      const name = d.is_group ? d.name || others.map((p) => p.display_name).join(', ') : first?.display_name ?? 'Utilisateur';
      const icon = d.is_group ? d.icon_url : first?.avatar_url ?? null;
      out.push({
        key: `dm:${d.id}`,
        name,
        sub: d.is_group ? `${d.participants.length} membres` : first?.username ?? '',
        iconUrl: icon,
        badge: null,
        fav: { kind: 'dm', ref_id: d.id, server_id: null, channel_id: null, name, sub: d.is_group ? null : first?.username ?? null, icon_url: icon, ch_type: null },
      });
    }
    return out.filter((r) => !existing.has(r.key));
  }, [servers, channels, dms, user?.id, existing]);

  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? rows.filter((r) => r.name.toLowerCase().includes(n) || r.sub.toLowerCase().includes(n)) : rows;
  }, [rows, q]);

  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const close = (o: boolean) => {
    if (!o) {
      setQ('');
      setPicked([]);
    }
    onOpenChange(o);
  };

  return (
    <FavDialog open={open} onOpenChange={close} title="Ajouter aux favoris">
      <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border-2 border-transparent bg-[#2f2f37] px-3 transition-colors focus-within:border-[#5b63e4]">
        <Search className="h-4 w-4 shrink-0 text-[#b5bac1]" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher" className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-[#80848e]" />
        {q && (
          <button type="button" aria-label="Effacer" onClick={() => setQ('')} className="flex h-4 w-4 items-center justify-center rounded-full bg-[#b5bac1] text-[#2f2f37]">
            <X className="h-2.5 w-2.5" />
          </button>
        )}
      </label>
      <div className="scrollbar-thin -mr-2 mt-2 h-[420px] overflow-y-auto pr-1">
        {shown.map((r) => {
          const on = picked.includes(r.key);
          return (
            <button key={r.key} type="button" onClick={() => toggle(r.key)} className="flex h-[61px] w-full items-center gap-3 rounded-[4px] px-3 text-left transition-colors hover:bg-[#464650]">
              <SourceTile iconUrl={r.iconUrl} label={r.name} badge={r.badge} />
              <span className="min-w-0 flex-1">
                <span translate="no" className="block truncate text-base font-semibold leading-5 text-white">{r.name}</span>
                <span translate="no" className="block truncate text-sm leading-[18px] text-[#b5bac1]">{r.sub}</span>
              </span>
              <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border-2', on ? 'border-[#5865f2] bg-[#5865f2]' : 'border-[#b5bac1]')}>
                {on && <svg viewBox="0 0 12 12" className="h-3 w-3 text-white"><path d="M2 6.5l2.6 2.6L10 3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              </span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="px-3 py-10 text-center text-sm text-[#b5bac1]">Aucun résultat.</p>}
      </div>
      <button
        type="button"
        disabled={picked.length === 0}
        onClick={() => {
          onAdd(rows.filter((r) => picked.includes(r.key)).map((r) => r.fav));
          close(false);
        }}
        className={cn(FAV_BTN_BLUE, 'mt-3 w-full')}
      >
        Ajouter aux favoris
      </button>
    </FavDialog>
  );
}
