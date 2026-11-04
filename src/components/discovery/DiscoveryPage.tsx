import { useEffect, useState } from 'react';
import { Compass } from '@/components/icons/discord/lucide';
import { Store, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setDesktopTitle } from '@/lib/desktop';
import type { DiscoveryServer, DiscoverApp } from '@/hooks/useDiscovery';
import { useServers } from '@/hooks/useServers';
import { APP_TABS, SERVER_TABS, type DiscoverSection } from './discoveryConfig';
import { DiscoveryHero, DiscoveryTabBar } from './DiscoveryParts';
import { ServersView } from './ServersView';
import { AppsView } from './AppsView';
import { AppDetail } from './AppDetail';
import { ServerPreview } from './ServerPreview';

/*
 * Page "Decouvrir" (video de reference) : colonne de gauche "Decouvrir" avec Applications / Serveurs, puis banniere
 * degradee, onglets (soulignement glissant) et recherche, et les cartes dessous. Un clic sur un serveur ouvre
 * l'apercu (la carte s'estompe le temps de l'ouverture), un clic sur une application ouvre sa fiche.
 */

interface Props {
  onJoinServer: (serverId: string) => void;
  onOpenServer: (serverId: string) => void;
  joining?: boolean;
}

export function DiscoveryPage({ onJoinServer, onOpenServer, joining = false }: Props) {
  const [section, setSection] = useState<DiscoverSection>('servers');
  const [tabs, setTabs] = useState<Record<DiscoverSection, string>>({ servers: 'home', apps: 'home' });
  const [query, setQuery] = useState('');
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [preview, setPreview] = useState<DiscoveryServer | null>(null);
  const [app, setApp] = useState<DiscoverApp | null>(null);
  const { data: myServers = [] } = useServers();

  useEffect(() => {
    setDesktopTitle({ name: 'Découvrir', iconUrl: null, glyph: 'discover' });
    return () => setDesktopTitle({ name: null, iconUrl: null });
  }, []);

  const tabDefs = section === 'servers' ? SERVER_TABS : APP_TABS;
  const activeTab = tabs[section];
  const def = tabDefs.find((t) => t.id === activeTab) ?? tabDefs[0];

  const openServer = (s: DiscoveryServer) => {
    if (s.is_member || myServers.some((m) => m.id === s.id)) return onOpenServer(s.id);
    setOpeningId(s.id);
    window.setTimeout(() => { setPreview(s); setOpeningId(null); }, 280);
  };
  const switchSection = (s: DiscoverSection) => { setSection(s); setQuery(''); setApp(null); setPreview(null); };

  const nav = (id: DiscoverSection, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      onClick={() => switchSection(id)}
      className={cn('w-full h-[46px] px-3 flex items-center gap-3 rounded-lg text-base font-medium transition-colors', section === id ? 'bg-[#3c3c44] text-white' : 'text-[#b5bac1] hover:bg-[#35353d] hover:text-white')}
    >
      <span className="w-[22px] h-[22px] flex items-center justify-center [&>svg]:w-[22px] [&>svg]:h-[22px]">{icon}</span>{label}
    </button>
  );

  if (preview) {
    return (
      <div className="flex-1 flex min-w-0 min-h-0 bg-[#313139]">
        <ServerPreview server={preview} joining={joining} onBack={() => setPreview(null)} onJoin={() => onJoinServer(preview.id)} />
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-w-0 min-h-0 bg-[#313139]">
      <div className="w-[280px] shrink-0 bg-surface-1 flex flex-col">
        <div className="h-[50px] px-4 flex items-center text-xl font-semibold text-white border-b border-black/20 shrink-0">Découvrir</div>
        <nav className="p-2.5 space-y-1">
          {nav('apps', 'Applications', <LayoutGrid />)}
          {nav('servers', 'Serveurs', <Store />)}
        </nav>
      </div>

      {app ? (
        <AppDetail app={app} onBack={() => setApp(null)} onOpenApp={setApp} />
      ) : (
        <div className="relative flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin relative">
            <DiscoveryHero tab={def} />
            <DiscoveryTabBar
              icon={section === 'servers' ? <Store /> : <LayoutGrid />}
              tabs={tabDefs}
              active={activeTab}
              onChange={(id) => { setTabs((t) => ({ ...t, [section]: id })); setQuery(''); }}
              query={query}
              onQuery={setQuery}
            />
            {section === 'servers' ? (
              <ServersView tab={activeTab} query={query} openingId={openingId} onOpen={openServer} />
            ) : (
              <AppsView tab={activeTab} query={query} onOpen={setApp} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { Compass as DiscoverCompass };
