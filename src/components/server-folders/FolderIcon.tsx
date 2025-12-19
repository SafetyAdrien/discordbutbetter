import { Server } from '@/types/app';
import { cn } from '@/lib/utils';

interface FolderIconProps {
  servers: Server[];
  color?: string;
  isExpanded: boolean;
  isActive: boolean;
  hasUnread: boolean;
  className?: string;
}

// Mini server icon for the 2x2 grid (closed state)
function MiniServerIcon({ server }: { server: Server }) {
  return (
    <div className="w-full h-full rounded-[4px] overflow-hidden bg-[#36393f] flex items-center justify-center">
      {server.icon ? (
        server.icon.startsWith('http') ? (
          <img
            src={server.icon}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="text-[10px] text-white/80">{server.icon}</span>
        )
      ) : (
        <span className="text-[7px] font-semibold text-white/60">
          {server.name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

/**
 * Discord-style folder icon
 * - Closed: 2x2 grid of mini server icons in a squircle
 * - Open: Small folder handle icon
 */
export function FolderIcon({
  servers,
  color,
  isExpanded,
  isActive,
  hasUnread,
  className,
}: FolderIconProps) {
  // Get up to 4 servers for the closed state grid
  const displayServers = servers.slice(0, 4);

  // Open state: show a small folder handle at the top
  if (isExpanded) {
    return (
      <div
        className={cn(
          'w-12 h-8 flex items-center justify-center cursor-pointer',
          'hover:opacity-80 transition-opacity',
          className
        )}
      >
        {/* Folder handle icon - simplified folder shape */}
        <svg
          width="32"
          height="20"
          viewBox="0 0 32 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="text-[#b5bac1]"
        >
          <path
            d="M2 4C2 2.89543 2.89543 2 4 2H11.1716C11.702 2 12.2107 2.21071 12.5858 2.58579L14.4142 4.41421C14.7893 4.78929 15.298 5 15.8284 5H28C29.1046 5 30 5.89543 30 7V16C30 17.1046 29.1046 18 28 18H4C2.89543 18 2 17.1046 2 16V4Z"
            fill="currentColor"
            fillOpacity="0.4"
          />
        </svg>
      </div>
    );
  }

  // Closed state: 2x2 grid of mini server icons
  return (
    <div
      className={cn(
        'w-12 h-12 rounded-[16px] overflow-hidden cursor-pointer',
        'bg-[#2b2d31] hover:rounded-[12px] transition-all duration-200',
        isActive && 'rounded-[12px]',
        className
      )}
    >
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-[3px] p-[6px]">
        {displayServers.map((server) => (
          <MiniServerIcon key={server.id} server={server} />
        ))}
        {/* Fill empty slots with dark placeholders */}
        {Array.from({ length: Math.max(0, 4 - displayServers.length) }).map((_, i) => (
          <div
            key={`empty-${i}`}
            className="w-full h-full rounded-[4px] bg-[#36393f]"
          />
        ))}
      </div>
    </div>
  );
}
