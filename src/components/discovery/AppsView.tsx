import { useMemo } from 'react';
import { useDiscoverApps, type DiscoverApp } from '@/hooks/useDiscovery';
import { AppCard, CardSkeleton, SectionTitle } from './DiscoveryParts';
import { Button } from '@/components/ui/button';

/* Onglet "Applications" : "En ce moment" regroupe les applications par rubrique, les autres onglets filtrent par categorie. */

const GRID = 'grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]';

export function AppsView({ tab, query, onOpen }: { tab: string; query: string; onOpen: (a: DiscoverApp) => void }) {
  const { data = [], isLoading, isError, refetch } = useDiscoverApps();
  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => data.filter((a) => (tab === 'home' || a.category === tab) && (!q || a.name.toLowerCase().includes(q) || a.tagline.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))),
    [data, tab, q],
  );
  const sections = useMemo(() => {
    if (tab !== 'home' || q) return [{ title: q ? `Résultats pour « ${query.trim()} »` : '', items: filtered }];
    const featured = filtered.filter((a) => a.featured);
    const bySection = new Map<string, DiscoverApp[]>();
    for (const a of filtered.filter((x) => !x.featured)) bySection.set(a.section || 'Autres applications', [...(bySection.get(a.section || 'Autres applications') ?? []), a]);
    return [
      ...(featured.length ? [{ title: 'À la une', items: featured }] : []),
      ...[...bySection.entries()].map(([title, items]) => ({ title, items })),
    ];
  }, [filtered, tab, q, query]);

  return (
    <div className="px-5 pt-6 pb-6 animate-fade-in" key={`${tab}-${q}`}>
      {isError ? (
        <div className="py-16 text-center">
          <p className="text-base text-white font-semibold">Impossible de charger les applications.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void refetch()}>Réessayer</Button>
        </div>
      ) : isLoading ? (
        <div className={GRID}>{Array.from({ length: 8 }, (_, i) => <CardSkeleton key={i} height={310} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-xl font-semibold text-white">{q ? 'Aucune application trouvée' : 'Aucune application pour le moment'}</p>
          <p className="mt-1.5 text-sm text-[#b5bac1]">{q ? 'Essaie avec un autre mot-clé.' : 'Les applications publiées par les administrateurs apparaîtront ici.'}</p>
        </div>
      ) : (
        sections.map((s, i) => (
          <section key={s.title || i} className={i > 0 ? 'mt-10' : ''}>
            {s.title && <SectionTitle>{s.title}</SectionTitle>}
            <div className={GRID}>{s.items.map((a) => <AppCard key={a.id} app={a} showFeatured={tab === 'home'} onOpen={() => onOpen(a)} />)}</div>
          </section>
        ))
      )}

      <div className="mt-12 rounded-xl bg-[#39393f]/60 px-5 py-4 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-lg font-semibold text-white leading-6">Des questions ?</p>
          <p className="text-[13px] text-[#dbdee1]">Visite notre centre d'aide pour en savoir plus sur l'utilisation et la découverte d'applications sur Discord.</p>
        </div>
        <Button disabled className="shrink-0 bg-[#5865f2] opacity-60" title="Bientôt disponible">En savoir plus</Button>
      </div>
    </div>
  );
}
