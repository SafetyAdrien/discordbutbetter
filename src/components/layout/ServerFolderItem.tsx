import { useEffect, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { Folder } from '@/components/icons/discord/lucide';
import { Tooltip, TooltipTrigger } from '@/components/ui/tooltip';
import { RailTooltipContent } from './RailTooltip';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { MentionBadge } from '@/components/ui/MentionBadge';
import { DropBar, MergeDot } from './DndMarkers';
import { DEFAULT_FOLDER_COLOR, type ServerFolder } from '@/hooks/useServerFolders';
import type { Server } from '@/types/app';
import { cn } from '@/lib/utils';

/*
 * Dossier du rail (video de reference). Ferme : tuile de 48px (rayon 16) teintee
 * a la couleur du dossier, avec jusqu'a quatre icones en grille 2x2 et la
 * pastille de mentions cumulees. Ouvert : un fond arrondi de 48px regroupe la
 * glyphe de dossier (couleur du dossier) puis les serveurs en tuiles de 40px.
 * La pastille d'etat a gauche suit celle des serveurs : 40px quand le serveur
 * actif est dedans, 8px s'il y a des non-lus, 20px au survol.
 */

export const folderTileId = (id: string) => `folder:${id}`;

function MiniIcon({ server }: { server: Server }) {
  return (
    <span className="w-[19px] h-[19px] rounded-[5px] overflow-hidden flex items-center justify-center bg-[hsl(var(--surface-3))] text-[7px] font-semibold leading-none text-foreground">
      {server.icon?.startsWith('http') ? (
        <img src={server.icon} alt="" draggable={false} loading="lazy" className="w-full h-full object-cover" />
      ) : server.icon ? (
        <span className="text-[11px]">{server.icon}</span>
      ) : (
        server.name.slice(0, 2).toUpperCase()
      )}
    </span>
  );
}

interface Props {
  folder: ServerFolder;
  servers: Server[];
  containsActive: boolean;
  hasUnread: boolean;
  mentionCount: number;
  isMergeTarget: boolean;
  isDragging: boolean;
  dropIndicator: 'before' | 'after' | null;
  canMarkRead: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  onMove: (to: 'first' | 'last') => void;
  onSettings: () => void;
  onCloseAll: () => void;
  children?: React.ReactNode;
}

export function ServerFolderItem({
  folder,
  servers,
  containsActive,
  hasUnread,
  mentionCount,
  isMergeTarget,
  isDragging,
  dropIndicator,
  canMarkRead,
  onToggle,
  onMarkRead,
  onMove,
  onSettings,
  onCloseAll,
  children,
}: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition } = useSortable({
    id: folderTileId(folder.id),
    data: { type: 'folder', folder },
    // Seule la tuile du dossier le deplace : les serveurs qu'il contient se glissent un par un.
    handleOnly: true,
  });
  const color = folder.color ?? DEFAULT_FOLDER_COLOR;
  const names = servers.map((s) => s.name).join(', ');
  const tooltip = folder.name || (folder.expanded ? 'Nom du dossier' : names);

  const ex = folder.expanded;
  // Les pastilles blanches des serveurs du dossier sortent de la colonne (a gauche) : on ne coupe
  // le contenu que pendant l'animation d'ouverture / fermeture, jamais une fois le dossier ouvert.
  const [settled, setSettled] = useState(folder.expanded);
  useEffect(() => {
    setSettled(false);
    if (!folder.expanded) return;
    const t = setTimeout(() => setSettled(true), 280);
    return () => clearTimeout(t);
  }, [folder.expanded]);
  // Ouverture ~270 ms (video) : la tuile se replie sur la glyphe, le fond passe
  // du teint du dossier au gris neutre et le contenu se deploie vers le bas.
  const tile = (
    <button
      type="button"
      ref={setActivatorNodeRef}
      {...attributes}
      {...listeners}
      onClick={onToggle}
      aria-expanded={ex}
      data-rail-id={folderTileId(folder.id)}
      data-rail-kind="folder-tile"
      data-rail-entry={folderTileId(folder.id)}
      data-folder-id={folder.id}
      aria-label={folder.name || 'Dossier de serveurs'}
      className={cn(
        'relative group/tile select-none shrink-0 w-12 flex items-center justify-center rounded-[16px] transition-[height,transform] duration-[250ms] ease-out',
        ex ? 'h-10 mt-1' : 'h-12',
        isDragging && 'opacity-0',
      )}
    >
      <div
        className={cn(
          'absolute -left-3 w-1 rounded-r-full bg-foreground',
          ex ? 'h-0' : containsActive ? 'h-10' : hasUnread || mentionCount > 0 ? 'h-2' : 'h-0 group-hover/tile:h-5',
        )}
        style={{ transition: 'height 300ms' }}
      />
      <span
        className={cn(
          'absolute inset-0 grid grid-cols-2 gap-[2px] p-1 place-content-center pointer-events-none transition-[opacity,transform] duration-200 ease-out',
          ex ? 'opacity-0 scale-75' : 'opacity-100',
        )}
      >
        {servers.slice(0, 4).map((s) => (
          <MiniIcon key={s.id} server={s} />
        ))}
      </span>
      <Folder
        className={cn('w-6 h-6 pointer-events-none transition-[opacity,transform] duration-200 ease-out', ex ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3')}
        style={{ color }}
      />
      <MentionBadge
        count={ex ? 0 : mentionCount}
        size="md"
        className="absolute -bottom-1 -right-1 border-[3px] border-[hsl(var(--surface-server-list))] animate-badge-pop"
      />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{ transform: undefined, transition }}
      className="relative overflow-visible"
      data-rail-entry={folderTileId(folder.id)}
    >
      {dropIndicator === 'before' && <DropBar edge="before" />}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={cn('relative w-12 flex flex-col items-center transition-[background-color,filter] duration-[250ms]', ex ? 'rounded-[24px]' : 'rounded-[16px]', !ex && !isMergeTarget && 'hover:brightness-125', isDragging && '[&>*]:invisible !bg-white/[0.08]')}
            style={{
              backgroundColor: isMergeTarget ? 'hsl(var(--dnd-line) / 0.2)' : ex ? 'rgba(255,255,255,0.07)' : `color-mix(in srgb, ${color} 45%, transparent)`,
              boxShadow: isMergeTarget ? 'inset 0 0 0 1.5px hsl(var(--dnd-line))' : undefined,
            }}
          >
            {isMergeTarget && <MergeDot className={ex ? 'top-[24px]' : undefined} />}
            <Tooltip>
              <TooltipTrigger asChild>{tile}</TooltipTrigger>
              <RailTooltipContent>
                <p translate="no" className="font-semibold">{tooltip}</p>
              </RailTooltipContent>
            </Tooltip>
            <div
              className={cn(
                'grid w-full transition-[grid-template-rows,opacity] duration-[250ms] ease-out',
                ex ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
              )}
              aria-hidden={!ex}
              {...(!ex && { inert: '' as unknown as boolean })}
            >
              <div className={cn('min-h-0', settled ? 'overflow-visible' : 'overflow-hidden')}>
                <div className="flex flex-col items-center gap-2 pt-2 pb-1">{children}</div>
              </div>
            </div>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-[220px] bg-[hsl(var(--popover))]">
          <ContextMenuItem disabled={!canMarkRead} onSelect={onMarkRead}>
            Marquer le dossier comme lu
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuSub>
            <ContextMenuSubTrigger>
              Déplacer vers...
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-[190px]">
              <ContextMenuItem onSelect={() => onMove('first')}>Premier dans la liste</ContextMenuItem>
              <ContextMenuItem onSelect={() => onMove('last')}>Dernier dans la liste</ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={onSettings}>
            Paramètres du dossier
          </ContextMenuItem>
          <ContextMenuItem onSelect={onCloseAll}>
            Fermer tous les dossiers
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {dropIndicator === 'after' && <DropBar edge="after" />}
    </div>
  );
}
