import { Server } from '@/types/app';
import { cn } from '@/lib/utils';
import { Folder } from 'lucide-react';

interface FolderIconProps {
  servers: Server[];
  color: string;
  isExpanded: boolean;
  isActive: boolean;
  hasUnread: boolean;
  className?: string;
}

/**
 * Discord-style folder icon with 2x2 grid of server icons
 */
export function FolderIcon({
  servers,
  color,
  isExpanded,
  isActive,
  hasUnread,
  className,
}: FolderIconProps) {
  // Get up to 4 servers for the grid
  const displayServers = servers.slice(0, 4);

  if (isExpanded) {
    // When expanded, show a folder icon with the color
    return (
      <div
        className={cn(
          'w-12 h-12 rounded-[16px] flex items-center justify-center transition-all duration-200',
          isActive ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]',
          className
        )}
        style={{ backgroundColor: `${color}20` }}
      >
        <Folder className="w-6 h-6" style={{ color }} />
      </div>
    );
  }

  // When collapsed, show 2x2 grid of server icons
  return (
    <div
      className={cn(
        'w-12 h-12 rounded-[16px] transition-all duration-200 overflow-hidden relative',
        isActive ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]',
        className
      )}
      style={{ backgroundColor: `${color}30` }}
    >
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-[2px] p-[4px]">
        {displayServers.map((server, index) => (
          <div
            key={server.id}
            className="w-full h-full rounded-[4px] overflow-hidden bg-background/50 flex items-center justify-center"
          >
            {server.icon ? (
              server.icon.startsWith('http') ? (
                <img
                  src={server.icon}
                  alt=""
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <span className="text-[8px]">{server.icon}</span>
              )
            ) : (
              <span className="text-[6px] font-semibold text-foreground/70">
                {server.name.slice(0, 1).toUpperCase()}
              </span>
            )}
          </div>
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: 4 - displayServers.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-full h-full rounded-[4px] bg-background/30"
          />
        ))}
      </div>

      {/* Subtle color border */}
      <div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 2px ${color}40` }}
      />
    </div>
  );
}
