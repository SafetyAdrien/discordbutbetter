import { useServers } from '@/hooks/useServers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Crown } from 'lucide-react';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { useAuth } from '@/contexts/AuthContext';
import { haptics } from '@/lib/haptics';

interface Props {
  onBack: () => void;
  onSelectServer: (serverId: string) => void;
}

export function MobileServersListView({ onBack, onSelectServer }: Props) {
  const { user } = useAuth();
  const { data: servers = [] } = useServers();

  const ownedServers = servers.filter((s: any) => s.owner_id === user?.id);
  const joinedServers = servers.filter((s: any) => s.owner_id !== user?.id);

  return (
    <MobileProfileSubpage title="Mes serveurs" onBack={onBack}>
      {ownedServers.length > 0 && (
        <>
          <SectionHeader>
            <span className="flex items-center gap-1.5">
              <Crown className="w-3 h-3" />
              Mes serveurs ({ownedServers.length})
            </span>
          </SectionHeader>
          <ServerList servers={ownedServers} onSelect={onSelectServer} />
        </>
      )}

      {joinedServers.length > 0 && (
        <>
          <SectionHeader>Serveurs rejoints ({joinedServers.length})</SectionHeader>
          <ServerList servers={joinedServers} onSelect={onSelectServer} />
        </>
      )}

      {servers.length === 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-8 flex flex-col items-center text-center">
          <p className="text-sm text-muted-foreground">Aucun serveur pour le moment</p>
        </div>
      )}
    </MobileProfileSubpage>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="px-6 pt-6 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </h3>
  );
}

function ServerList({ servers, onSelect }: { servers: any[]; onSelect: (id: string) => void }) {
  return (
    <section className="mx-4 rounded-2xl bg-card border border-border/50 overflow-hidden">
      {servers.map((s, idx) => (
        <div key={s.id}>
          {idx > 0 && <div className="h-px bg-border/40 mx-4" />}
          <button
            onClick={() => {
              haptics.light();
              onSelect(s.id);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 active:bg-muted/40 transition-colors text-left"
          >
            <Avatar className="w-11 h-11 rounded-full">
              <AvatarImage src={s.icon_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {(s.name || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              {s.description && (
                <p className="text-xs text-muted-foreground truncate">{s.description}</p>
              )}
            </div>
          </button>
        </div>
      ))}
    </section>
  );
}
