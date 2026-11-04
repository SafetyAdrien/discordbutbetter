import { useEffect, useRef, useState } from 'react';
import { Search, X, Check } from '@/components/icons/discord/lucide';
import { cn } from '@/lib/utils';
import type { DiscoveryServer, DiscoverApp } from '@/hooks/useDiscovery';
import type { DiscoverTab } from './discoveryConfig';

/* Elements partages de la page Decouvrir : banniere, onglets, recherche, cartes et squelettes. */

/** Banniere degradee bleu nuit avec titre en capitales ; le texte change en fondu quand l'onglet change. */
export function DiscoveryHero({ tab, children }: { tab: DiscoverTab; children?: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ background: 'linear-gradient(118deg, #2c548e 0%, #24307a 28%, #1b1f5c 52%, #15132e 82%, #131225 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(900px 340px at 18% 20%, rgba(80,120,255,0.16), transparent 70%)' }} />
      <div key={tab.id} className="relative px-8 pt-[50px] pb-[10px] min-h-[349px] flex flex-col justify-center animate-fade-in">
        <h1 className="font-ginto font-black uppercase text-white text-[54px] leading-[44px] tracking-[0.01em] max-w-[760px]">{tab.title}</h1>
        <p className="mt-6 max-w-[560px] text-base leading-5 text-white/[0.62]">{tab.subtitle}</p>
        {children}
      </div>
    </div>
  );
}

/** Barre d'onglets posee sur la banniere : icone de section, onglets a soulignement glissant, recherche. */
export function DiscoveryTabBar({ icon, tabs, active, onChange, query, onQuery }: { icon: React.ReactNode; tabs: DiscoverTab[]; active: string; onChange: (id: string) => void; query: string; onQuery: (q: string) => void }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null);
  useEffect(() => {
    const el = refs.current[active];
    if (el) setBar({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, tabs]);
  const [focused, setFocused] = useState(false);
  return (
    <div className="absolute top-0 left-0 right-0 z-10 h-[50px] px-5 flex items-center gap-5 border-b border-white/[0.06] bg-[#1a2150]/20 backdrop-blur-[2px]">
      <span className="text-white shrink-0 flex items-center [&>svg]:w-6 [&>svg]:h-6">{icon}</span>
      <div className="relative h-full flex items-center gap-6 min-w-0 overflow-x-auto scrollbar-none" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el; }}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => onChange(t.id)}
            className={cn('h-full whitespace-nowrap text-[15px] font-semibold transition-colors', active === t.id ? 'text-white' : 'text-white/[0.68] hover:text-white')}
          >
            {t.label}
          </button>
        ))}
        {bar && <span className="absolute bottom-0 h-[2px] rounded-full bg-white transition-[left,width] duration-200 ease-out" style={{ left: bar.left, width: bar.width }} />}
      </div>
      <label className={cn('ml-auto shrink-0 w-[238px] h-8 px-2.5 flex items-center gap-2 rounded-md bg-black/[0.28] border transition-colors', focused ? 'border-[#5b63e4]' : 'border-white/[0.06]')}>
        <Search className="w-4 h-4 text-white/70 shrink-0" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Rechercher"
          aria-label="Rechercher"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-white placeholder:text-white/45"
        />
        {query && <button type="button" aria-label="Effacer" onClick={() => onQuery('')} className="text-white/70 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
      </label>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-[18px] text-lg leading-6 font-semibold text-white">{children}</h2>;
}

const PALETTE = [['#5865f2', '#9b59b6'], ['#1abc9c', '#2980b9'], ['#e67e22', '#c0392b'], ['#3498db', '#8e44ad'], ['#27ae60', '#16a085'], ['#e84393', '#6c5ce7']];
const gradientFor = (seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const [a, b] = PALETTE[h % PALETTE.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
};

function Icon({ url, name, size, radius }: { url: string | null; name: string; size: number; radius: number }) {
  return (
    <span className="relative shrink-0 bg-[#313139] border-[3px] border-[#35353d] overflow-hidden flex items-center justify-center text-white font-semibold" style={{ width: size, height: size, borderRadius: radius }}>
      {url ? <img src={url} alt="" className="w-full h-full object-cover" draggable={false} /> : <span aria-hidden style={{ fontSize: size * 0.34 }}>{name.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase()}</span>}
    </span>
  );
}

/** Carte serveur : banniere, icone chevauchante, nom (+ coche communaute), description, compteurs. */
export function ServerCard({ server, onOpen, opening }: { server: DiscoveryServer; onOpen: () => void; opening?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn('group relative flex flex-col text-left rounded-lg overflow-hidden bg-[#35353d] border border-white/[0.06] h-[320px] transition-[transform,background-color,opacity,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#393942] hover:shadow-[0_8px_16px_rgba(0,0,0,0.24)] active:translate-y-0', opening && 'opacity-40 pointer-events-none')}
    >
      <div className="relative h-[146px] shrink-0 bg-[#2b2c31]" style={server.banner_url ? undefined : { background: gradientFor(server.name) }}>
        {server.banner_url && <img src={server.banner_url} alt="" className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]" draggable={false} />}
      </div>
      <div className="absolute left-3.5 top-[116px]"><Icon url={server.icon_url} name={server.name} size={56} radius={16} /></div>
      <div className="px-4 pt-[34px] pb-4 flex flex-col flex-1 min-h-0">
        <p className="flex items-center gap-1.5 text-base leading-5 font-semibold text-white">
          {server.is_community && <CommunityBadge />}
          <span translate="no" className="truncate">{server.name}</span>
        </p>
        <p translate="no" className="mt-1.5 text-sm leading-[18px] text-[#dbdee1] line-clamp-3">{server.description || 'Aucune description.'}</p>
        <div className="mt-auto flex items-center gap-4 text-[13px] text-[#b5bac1]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#23a55a]" />{server.online_count} en ligne</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#80848e]" />{server.member_count} {server.member_count > 1 ? 'membres' : 'membre'}</span>
        </div>
      </div>
      {opening && (
        <span className="absolute inset-0 flex items-center justify-center opacity-100" aria-label="Ouverture…">
          <span className="h-10 px-3 rounded-lg bg-black/60 flex items-center gap-1.5">
            {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />)}
          </span>
        </span>
      )}
    </button>
  );
}

export function CommunityBadge({ className }: { className?: string }) {
  return (
    <span className={cn('shrink-0 w-4 h-4 rounded-full bg-[#23a55a] flex items-center justify-center', className)} title="Serveur communautaire">
      <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />
    </span>
  );
}

/** Carte application : banniere, icone chevauchante, nom, categorie, description. */
export function AppCard({ app, onOpen, showFeatured }: { app: DiscoverApp; onOpen: () => void; showFeatured?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative flex flex-col text-left rounded-lg overflow-hidden bg-[#35353d] border border-white/[0.06] h-[310px] transition-[transform,background-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:bg-[#393942] hover:shadow-[0_8px_16px_rgba(0,0,0,0.24)] active:translate-y-0"
    >
      <div className="relative h-[152px] shrink-0 overflow-hidden" style={app.banner_url ? undefined : { background: gradientFor(app.name) }}>
        {app.banner_url && <img src={app.banner_url} alt="" className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.04]" draggable={false} />}
      </div>
      <div className="absolute left-3 top-[120px]"><Icon url={app.icon_url} name={app.name} size={56} radius={14} /></div>
      <div className="px-4 pt-[34px] pb-4 flex-1 min-h-0">
        <p translate="no" className="text-base leading-5 font-semibold text-white truncate">{app.name}</p>
        <p className="mt-1 text-[13px] leading-4 text-[#b5bac1]">{app.category && ({ games: 'Jeux', entertainment: 'Divertissements', moderation: 'Modération et Outils', social: 'Social', services: 'Services' } as Record<string, string>)[app.category]}{showFeatured && app.featured ? ' • À la une' : ''}</p>
        <p translate="no" className="mt-2.5 text-sm leading-[18px] text-[#dbdee1] line-clamp-3">{app.tagline || app.description}</p>
      </div>
    </button>
  );
}

/** Carte grise qui pulse pendant le chargement. */
export function CardSkeleton({ height = 320, className }: { height?: number; className?: string }) {
  return <div className={cn('rounded-lg bg-white/[0.035] border border-white/[0.04] animate-pulse', className)} style={{ height }} aria-hidden />;
}

export const CARD_GRID = 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(340px,1fr))]';
