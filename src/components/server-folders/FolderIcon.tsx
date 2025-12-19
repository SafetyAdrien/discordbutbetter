import { Server } from '@/types/app';
import { cn } from '@/lib/utils';

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

  // When expanded, show a darker rounded container
  if (isExpanded) {
    return (
      <div
        className={cn(
          'w-12 h-12 flex items-center justify-center transition-all duration-200',
          'rounded-[16px] bg-[#2b2d31]',
          className
        )}
      >
        <div className="grid grid-cols-2 grid-rows-2 gap-[3px] w-[36px] h-[36px]">
          {displayServers.map((server) => (
            <div
              key={server.id}
              className="w-full h-full rounded-[4px] overflow-hidden bg-[#1e1f22] flex items-center justify-center"
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
                  <span className="text-[10px]">{server.icon}</span>
                )
              ) : (
                <span className="text-[8px] font-semibold text-muted-foreground">
                  {server.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
          ))}
          {/* Fill empty slots */}
          {Array.from({ length: 4 - displayServers.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="w-full h-full rounded-[4px] bg-[#1e1f22]"
            />
          ))}
        </div>
      </div>
    );
  }

  // When collapsed, show 2x2 grid of server icons
  return (
    <div
      className={cn(
        'w-12 h-12 flex items-center justify-center transition-all duration-200',
        isActive ? 'rounded-[16px]' : 'rounded-[24px] hover:rounded-[16px]',
        'bg-[#2b2d31]',
        className
      )}
    >
      <div className="grid grid-cols-2 grid-rows-2 gap-[3px] w-[36px] h-[36px]">
        {displayServers.map((server) => (
          <div
            key={server.id}
            className="w-full h-full rounded-[4px] overflow-hidden bg-[#1e1f22] flex items-center justify-center"
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
                <span className="text-[10px]">{server.icon}</span>
              )
            ) : (
              <span className="text-[8px] font-semibold text-muted-foreground">
                {server.name.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        ))}
        {/* Fill empty slots */}
        {Array.from({ length: 4 - displayServers.length }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-full h-full rounded-[4px] bg-[#1e1f22]"
          />
        ))}
      </div>
    </div>
  );
}
