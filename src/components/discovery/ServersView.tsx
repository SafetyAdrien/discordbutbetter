import { useMemo } from 'react';
import { useDiscoveryServers, type DiscoveryServer } from '@/hooks/useDiscovery';
import { SERVER_TABS } from './discoveryConfig';
import { ServerCard, CardSkeleton, SectionTitle, CARD_GRID } from './DiscoveryParts';
import { Button } from '@/components/ui/button';

/* Onglet "Serveurs" : serveurs du moment (Accueil), serveurs par categorie, recherche et Poles etudiants. */

interface Props {
  tab: string;
  query: string;
  openingId: string | null;
  onOpen: (s: DiscoveryServer) => void;
}

export function ServersView({ tab, query, openingId, onOpen }: Props) {
  const category = tab === 'home' || tab === 'hubs' ? null : tab;
  const { data = [], isLoading, isError, refetch } = useDiscoveryServers(category, query.trim());
  const def = SERVER_TABS.find((t) => t.id === tab) ?? SERVER_TABS[0];
  const list = useMemo(() => data, [data]);

  if (tab === 'hubs' && !query) return <StudentHubs />;

  return (
    <div className="px-5 pt-6 pb-10 animate-fade-in" key={`${tab}-${query}`}>
      <SectionTitle>{query ? `Résultats pour « ${query} »` : def.rowTitle}</SectionTitle>
      {isError ? (
        <div className="py-16 text-center">
          <p className="text-base text-white font-semibold">Impossible de charger les serveurs.</p>
          <Button variant="secondary" className="mt-3" onClick={() => void refetch()}>Réessayer</Button>
        </div>
      ) : isLoading ? (
        <div className={CARD_GRID}>{Array.from({ length: 6 }, (_, i) => <CardSkeleton key={i} />)}</div>
      ) : list.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-xl font-semibold text-white">{query ? 'Aucun serveur trouvé' : 'Aucun serveur pour le moment'}</p>
          <p className="mt-1.5 text-sm text-[#b5bac1]">{query ? 'Essaie avec un autre mot-clé.' : 'Les serveurs en Mode Découverte apparaîtront ici.'}</p>
        </div>
      ) : (
        <div className={CARD_GRID}>
          {list.map((s) => <ServerCard key={s.id} server={s} opening={openingId === s.id} onOpen={() => onOpen(s)} />)}
        </div>
      )}
    </div>
  );
}

function StudentHubs() {
  return (
    <div className="px-5 pt-6 pb-10 animate-fade-in max-w-[520px]">
      <div className="rounded-lg bg-[#35353d] border border-white/[0.06] p-6">
        <span className="w-10 h-10 rounded-full bg-[#23a55a]/25 text-[#23a55a] flex items-center justify-center text-lg" aria-hidden>🎓</span>
        <p className="mt-3 text-base font-semibold text-white leading-[22px]">Trouve des groupes d'étude, des clubs et des amis sur le Pôle étudiant de ton établissement scolaire !</p>
        <p className="mt-2 text-sm leading-[18px] text-[#b5bac1]">Rencontre d'autres étudiants de ton école, découvre des communautés et partage tes serveurs, et tout ça sans même quitter Discord.</p>
        <Button disabled className="mt-4 w-full bg-[#248046] hover:bg-[#248046] text-white opacity-60">Rejoindre un Pôle — bientôt disponible</Button>
      </div>
      <p className="mt-6 text-xs leading-4 text-[#b5bac1]">Les serveurs du Pôle ne sont pas affiliés aux établissements scolaires ni gérés par eux.</p>
      <p className="mt-2 text-xs leading-4 text-[#b5bac1]">Les serveurs listés dans le Pôle étudiant d'une école sont gérés par les étudiants. Les utilisateurs n'ont pas besoin d'être membre d'un Pôle étudiant pour être invités à rejoindre un serveur qui y est listé.</p>
    </div>
  );
}
