import { useState, forwardRef } from 'react';
import { Server } from '@/types/app';
import { X, Search, Users, Compass, Gamepad2, Palette, Music, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

    const filteredServers = servers.filter((server) =>
      server.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      server.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div ref={ref} className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl h-[90vh] bg-card rounded-xl border border-border shadow-2xl overflow-hidden flex animate-slide-in-right">
        {/* Sidebar */}
        <div className="w-60 bg-sidebar border-r border-border p-4 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Compass className="w-6 h-6 text-primary" />
            <h2 className="font-display font-bold text-lg">Découvrir</h2>
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-display font-bold glow-text">
                  Découvrir des serveurs
                </h1>
                <p className="text-muted-foreground mt-1">
                  Trouvez votre prochaine communauté parmi des milliers de serveurs
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="relative">
              <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher des serveurs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 text-base bg-input"
              />
            </div>
          </div>

          {/* Server Grid */}
          <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
              Serveurs en vedette
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServers.map((server) => (
                <div
                  key={server.id}
                  className="group bg-surface-elevated rounded-xl border border-border overflow-hidden hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 cursor-pointer"
                  onClick={() => onJoinServer(server.id)}
                >
                  {/* Banner */}
                  <div className="h-24 bg-gradient-gaming relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated/80 to-transparent" />
                    <div className="absolute bottom-3 left-3">
                      <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform">
                        {server.icon}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {server.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {server.description}
                    </p>
                    
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
