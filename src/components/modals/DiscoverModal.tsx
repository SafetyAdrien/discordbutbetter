import { useState, forwardRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Server } from '@/types/app';
import { X, Search, Users, Compass, Gamepad2, Palette, Music, Code, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { MobilePullIndicator } from '@/components/mobile/MobilePullIndicator';

interface DiscoverModalProps {
  servers: Server[];
  onClose: () => void;
  onJoinServer: (serverId: string) => void;
}

const categories = [
  { id: 'all', name: 'Tout', icon: Compass },
  { id: 'gaming', name: 'Gaming', icon: Gamepad2 },
  { id: 'art', name: 'Art & Design', icon: Palette },
  { id: 'music', name: 'Musique', icon: Music },
  { id: 'tech', name: 'Tech', icon: Code },
];

export const DiscoverModal = forwardRef<HTMLDivElement, DiscoverModalProps>(
  function DiscoverModal({ servers, onClose, onJoinServer }, ref) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const { isMobile } = useBreakpoint();
    const queryClient = useQueryClient();

    const { containerRef, pullDistance, progress, refreshing } =
      usePullToRefresh<HTMLDivElement>({
        onRefresh: async () => {
          await queryClient.invalidateQueries({ queryKey: ['servers'] });
        },
        disabled: !isMobile,
      });

    const filteredServers = servers.filter((server) =>
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      {!isMobile && <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />}
      
      <div className={cn(
        "relative bg-card overflow-hidden flex animate-slide-in-right",
        isMobile 
          ? "w-full h-full flex-col" 
          : "w-full max-w-5xl h-[90vh] rounded-xl border border-border shadow-2xl"
      )}>
        {/* Sidebar - hidden on mobile */}
        {!isMobile && (
          <div className="w-60 bg-sidebar border-r border-border p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-6">
              <Compass className="w-6 h-6 text-primary" />
              <h2 className="font-ginto font-bold text-lg">Découvrir</h2>
            </div>
            <nav className="space-y-1">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    onClick={() => setActiveCategory(category.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      activeCategory === category.id
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {category.name}
                  </button>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className={cn("border-b border-border", isMobile ? "p-3" : "p-6")}>
            <div className="flex items-center justify-between mb-3">
              {isMobile ? (
                <div className="flex items-center gap-2">
                  <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h1 className="font-semibold text-sm">Découvrir</h1>
                </div>
              ) : (
                <div>
                  <h1 className="text-2xl font-ginto font-bold glow-text">Découvrir des serveurs</h1>
                  <p className="text-muted-foreground mt-1">Trouvez votre prochaine communauté</p>
                </div>
              )}
              {!isMobile && (
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>

            {/* Category chips on mobile */}
            {isMobile && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2 -mx-1 px-1 scrollbar-thin">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                      activeCategory === cat.id
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <cat.icon className="w-3.5 h-3.5" />
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher des serveurs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn("pl-12 bg-input", isMobile ? "h-10 text-sm" : "h-12 text-base")}
              />
            </div>
          </div>

          {/* Server Grid */}
          <div
            ref={containerRef}
            className="relative flex-1 overflow-y-auto overscroll-contain scrollbar-thin p-4"
          >
            {isMobile && (
              <MobilePullIndicator
                pullDistance={pullDistance}
                progress={progress}
                refreshing={refreshing}
              />
            )}
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Serveurs en vedette
            </h3>
            
            <div className={cn("grid gap-4", isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3")}>
              {filteredServers.map((server) => (
                <div
                  key={server.id}
                  className="group bg-surface-elevated rounded-xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
                  onClick={() => onJoinServer(server.id)}
                >
                  <div className="h-24 bg-gradient-gaming relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated/80 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                        {server.icon}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">{server.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{server.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-status-online" />
                        <span>{Math.floor(server.memberCount * 0.3).toLocaleString()} en ligne</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{server.memberCount.toLocaleString()} membres</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }
);
