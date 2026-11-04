import { useState, useRef, useCallback, useMemo, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useServerRoles, useCreateRole, useDeleteRole, useReorderRoles, useDuplicateRole, useRoleMemberCounts, RoleWithPermissions } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Button } from '@/components/ui/button';
import { RoleEditor } from './RoleEditor';
import { GripVertical, Loader2 } from 'lucide-react';
import { ArrowLeft, ChevronRight, ChevronUp, Copy, Pencil, Trash2 } from '@/components/icons/discord/lucide';
import { ChevronDown, MoreHorizontal, Plus, Search, User as UserIcon, Users } from '@/components/icons/serverSettingsIcons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SettingsPage } from './SettingsUI';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { settingsInputCls } from './settingsStyles';
import { toast } from 'sonner';

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

interface RoleManagerProps {
  serverId: string;
}

// Role Icon Component - supports forwardRef for DragOverlay compatibility
const RoleIcon = forwardRef<HTMLDivElement, { role: RoleWithPermissions; size?: 'sm' | 'md' }>(
  ({ role, size = 'sm' }, ref) => {
    const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
    const textSize = size === 'sm' ? 'text-sm' : 'text-base';

    if (role.icon_url) {
      if (!role.icon_url.startsWith('http')) {
        return <span ref={ref as React.Ref<HTMLSpanElement>} className={textSize}>{role.icon_url}</span>;
      }
      return <img src={role.icon_url} alt="" className={cn(sizeClasses, 'object-contain flex-shrink-0')} />;
    }

    return (
      <div
        ref={ref}
        className={cn(sizeClasses, 'rounded-full flex-shrink-0')}
        style={{ backgroundColor: role.color || '#99AAB5' }}
      />
    );
  }
);
RoleIcon.displayName = 'RoleIcon';

// Sortable Role Component
function SortableRole({
  role,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  memberCount,
  dropIndicator,
  canDragAbove,
  showArrows,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  role: RoleWithPermissions;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  memberCount: number;
  dropIndicator: 'before' | 'after' | null;
  canDragAbove?: boolean;
  showArrows?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}) {
  const isDisabled = !canDragAbove;

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: role.id,
    disabled: isDisabled,
  });

  // Ni deplacement ni fantome (video de reference) : la ligne glissee reste en place sous forme
  // d'emplacement gris, la barre verte indique ou elle tombera.
  const style = { transform: undefined as string | undefined };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Inline drop indicator - before */}
      {dropIndicator === 'before' && <div className="absolute inset-x-0 -top-px z-10 h-[3px] -translate-y-1/2 rounded-full bg-[hsl(var(--dnd-line))] pointer-events-none" />}

      <div
        className={cn(
          'grid grid-cols-[24px_1fr_88px_auto] items-center gap-2 h-14 pr-2 border-b border-border group cursor-pointer transition-colors',
          isSelected ? 'bg-[hsl(var(--interactive-background-selected))]' : 'hover:bg-[hsl(var(--interactive-background-hover))]',
          isDragging && 'bg-white/[0.08] [&>*]:invisible',
        )}
        onClick={onSelect}
      >
        {/* Poignee de glisser-deposer, visible au survol comme sur Discord */}
        <div
          ref={setActivatorNodeRef}
          {...(isDisabled ? {} : { ...attributes, ...listeners })}
          className={cn(
            'flex items-center justify-center h-full touch-none select-none',
            isDisabled ? 'invisible' : 'cursor-grab active:cursor-grabbing text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity',
          )}
          onPointerDown={(e) => {
            e.stopPropagation();
            const sensorHandler = isDisabled ? undefined : (listeners as { onPointerDown?: (ev: React.PointerEvent) => void } | undefined)?.onPointerDown;
            sensorHandler?.(e);
          }}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-3 min-w-0">
          <RoleIcon role={role} size="md" />
          <span translate="no" className="truncate text-base font-medium text-foreground" style={{ color: role.color && role.color !== '#99AAB5' ? role.color : undefined }}>
            {role.name}
          </span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          {memberCount}
          <UserIcon className="w-4 h-4" />
        </div>
        <div className="flex items-center gap-2">
          {showArrows && !isDisabled && (
            <div className="flex flex-col">
              <button type="button" onClick={(e) => { e.stopPropagation(); onMoveUp?.(); }} disabled={!canMoveUp} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20" aria-label="Monter le rôle">
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); onMoveDown?.(); }} disabled={!canMoveDown} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20" aria-label="Descendre le rôle">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <button type="button" aria-label="Modifier le rôle" onClick={(e) => { e.stopPropagation(); onSelect(); }} className="w-9 h-9 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-foreground hover:text-white">
            <Pencil className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" aria-label="Plus d'options" onClick={(e) => e.stopPropagation()} className="w-9 h-9 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center text-foreground hover:text-white">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={onDuplicate}><Copy className="w-4 h-4 mr-2" />Dupliquer</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" />Supprimer</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Inline drop indicator - after */}
      {dropIndicator === 'after' && <div className="absolute inset-x-0 -bottom-px z-10 h-[3px] translate-y-1/2 rounded-full bg-[hsl(var(--dnd-line))] pointer-events-none" />}
    </div>
  );
}

export function RoleManager({ serverId }: RoleManagerProps) {
  const { isMobile } = useBreakpoint();
  const { data: roles = [], isLoading } = useServerRoles(serverId);
  const { data: memberCounts = {} } = useRoleMemberCounts(serverId);
  const { isGod, canDragRole: canDragRolePosition, userHighestRolePosition } = usePermissions(serverId);
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const reorderRoles = useReorderRoles();
  const duplicateRole = useDuplicateRole();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleQuery, setRoleQuery] = useState('');
  const [roleToDelete, setRoleToDelete] = useState<RoleWithPermissions | null>(null);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');
  const wasDraggingRef = useRef(false);

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  // Separate default role — always last, never draggable
  const defaultRole = roles.find(r => r.is_default);
  const sortableRoles = useMemo(() => roles.filter(r => !r.is_default), [roles]);
  
  const sortableRoleIds = useMemo(() => sortableRoles.map(r => r.id), [sortableRoles]);

  const canDragRole = (role: RoleWithPermissions) => {
    if (role.is_default) return false;
    return canDragRolePosition(role.position);
  };

  // DnD sensors - PointerSensor only (handles both mouse and touch via Pointer Events API)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = event.active.id as string;
    const role = roles.find(r => r.id === id);

    if (role && !canDragRole(role)) {
      toast.error('Vous ne pouvez pas déplacer un rôle au-dessus du vôtre');
      return;
    }

    setActiveId(id);
    wasDraggingRef.current = true;
  }, [roles]);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;

    if (!over || over.id === active.id) {
      setOverId(null);
      return;
    }

    setOverId(over.id as string);
    const activeIdx = sortableRoleIds.indexOf(active.id as string);
    const overIdx = sortableRoleIds.indexOf(over.id as string);
    setDropPosition(activeIdx < overIdx ? 'after' : 'before');
  }, [sortableRoleIds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (over && active.id !== over.id) {
      const activeRole = sortableRoles.find(r => r.id === active.id);
      const overRole = sortableRoles.find(r => r.id === over.id);

      if (activeRole && overRole && !isGod) {
        const targetPosition = overRole.position ?? 0;
        if (targetPosition >= userHighestRolePosition) {
          toast.error('Vous ne pouvez pas déplacer un rôle au-dessus du vôtre');
          setTimeout(() => { wasDraggingRef.current = false; }, 150);
          return;
        }
      }

      const oldIndex = sortableRoleIds.indexOf(active.id as string);
      const newIndex = sortableRoleIds.indexOf(over.id as string);
      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(sortableRoleIds, oldIndex, newIndex);
        // Append the default role at the end
        if (defaultRole) newOrder.push(defaultRole.id);
        reorderRoles.mutate({ serverId, orderedIds: newOrder });
      }
    }

    setTimeout(() => { wasDraggingRef.current = false; }, 150);
  }, [sortableRoles, sortableRoleIds, defaultRole, isGod, userHighestRolePosition, serverId, reorderRoles]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
    setTimeout(() => { wasDraggingRef.current = false; }, 150);
  }, []);

  // Arrow fallback for touch devices — same reorder logic as drag, one step at a time.
  const moveRole = useCallback((roleId: string, direction: 'up' | 'down') => {
    const index = sortableRoleIds.indexOf(roleId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sortableRoleIds.length) return;

    const targetRole = sortableRoles[targetIndex];
    if (targetRole && !isGod) {
      const targetPosition = targetRole.position ?? 0;
      if (targetPosition >= userHighestRolePosition) {
        toast.error('Vous ne pouvez pas déplacer un rôle au-dessus du vôtre');
        return;
      }
    }

    const newOrder = arrayMove(sortableRoleIds, index, targetIndex);
    if (defaultRole) newOrder.push(defaultRole.id);
    reorderRoles.mutate({ serverId, orderedIds: newOrder });
  }, [sortableRoles, sortableRoleIds, defaultRole, isGod, userHighestRolePosition, serverId, reorderRoles]);

  const handleRoleSelect = useCallback((roleId: string) => {
    if (wasDraggingRef.current) return;
    setSelectedRoleId(roleId);
  }, []);

  // Confirmation avant suppression, comme la fenetre "Supprimer le role" de Discord.
  const handleDeleteRole = (roleId: string) => setRoleToDelete(roles.find((r) => r.id === roleId) ?? null);
  const confirmDeleteRole = () => {
    if (!roleToDelete) return;
    if (selectedRoleId === roleToDelete.id) setSelectedRoleId(null);
    deleteRole.mutate({ roleId: roleToDelete.id, serverId });
    setRoleToDelete(null);
  };

  const handleDuplicateRole = (roleId: string) => {
    duplicateRole.mutate({ roleId, serverId });
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleCreateDefaultRole = () => {
    createRole.mutate(
      { serverId, name: 'nouveau rôle' },
      { onSuccess: (created) => created?.id && setSelectedRoleId(created.id) },
    );
  };

  const q = roleQuery.trim().toLowerCase();
  const visibleRoles = q ? sortableRoles.filter((r) => r.name.toLowerCase().includes(q)) : sortableRoles;

  const sortableList = (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext items={sortableRoleIds} strategy={verticalListSortingStrategy}>
        <div className={cn(activeId && 'cursor-grabbing')}>
          {visibleRoles.map((role, index) => (
            <SortableRole
              key={role.id}
              role={role}
              isSelected={false}
              onSelect={() => handleRoleSelect(role.id)}
              onDelete={() => handleDeleteRole(role.id)}
              onDuplicate={() => handleDuplicateRole(role.id)}
              memberCount={memberCounts[role.id] || 0}
              dropIndicator={overId === role.id && activeId !== role.id ? dropPosition : null}
              canDragAbove={canDragRole(role) && !q}
              showArrows={isMobile}
              onMoveUp={() => moveRole(role.id, 'up')}
              onMoveDown={() => moveRole(role.id, 'down')}
              canMoveUp={index > 0}
              canMoveDown={index < sortableRoles.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );

  // Mode edition : colonne des roles a gauche, editeur a droite (video).
  if (selectedRole) {
    return (
      <div className="flex gap-6">
        <div className="w-[170px] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setSelectedRoleId(null)} className="flex items-center gap-2 text-base font-semibold text-white hover:underline">
              <ArrowLeft className="w-5 h-5" />
              Retour
            </button>
            <button type="button" aria-label="Création de rôle" onClick={handleCreateDefaultRole} className="text-[hsl(var(--header-icon))] hover:text-white">
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-0.5">
            {[...sortableRoles, ...(defaultRole ? [defaultRole] : [])].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSelect(r.id)}
                className={cn(
                  'w-full flex items-center gap-2 h-8 px-2 rounded-lg text-left text-sm font-medium transition-colors',
                  r.id === selectedRole.id
                    ? 'bg-[hsl(var(--interactive-background-selected))] text-white'
                    : 'text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-hover))]',
                )}
              >
                <RoleIcon role={r} />
                <span translate="no" className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <RoleEditor
            role={selectedRole}
            serverId={serverId}
            onDuplicate={() => handleDuplicateRole(selectedRole.id)}
            onDelete={() => handleDeleteRole(selectedRole.id)}
          />
        </div>
      <Dialog open={!!roleToDelete} onOpenChange={(o) => !o && setRoleToDelete(null)}>
        <DialogContent className="sm:max-w-[400px] p-6 gap-0">
          <DialogTitle className="text-xl font-semibold text-white">Supprimer le rôle</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Tu es sûr(e) de vouloir supprimer le rôle <strong className="text-foreground">{roleToDelete?.name}</strong> ? Cette action est irréversible.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRoleToDelete(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDeleteRole}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    );
  }

  return (
    <SettingsPage title="Rôles" description="Utilise des rôles pour regrouper les membres de ton serveur et leur assigner des permissions.">
      {defaultRole && (
        <button
          type="button"
          onClick={() => handleRoleSelect(defaultRole.id)}
          className="w-full flex items-center gap-4 p-4 rounded-lg bg-[hsl(var(--card))] hover:bg-[hsl(var(--interactive-background-hover))] text-left transition-colors"
        >
          <span className="w-10 h-10 shrink-0 rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center">
            <Users className="w-5 h-5 text-foreground" />
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-base font-semibold text-white">Permissions par défaut</span>
            <span className="block text-sm text-muted-foreground">@everyone • s'applique à tous les membres du serveur</span>
          </span>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      )}

      <div className="mt-6 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={roleQuery} onChange={(e) => setRoleQuery(e.target.value)} placeholder="Rechercher des rôles" className={cn(settingsInputCls, 'pl-9')} />
        </div>
        <Button onClick={handleCreateDefaultRole} disabled={createRole.isPending}>
          Création de rôle
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Les membres utilisent la couleur du rôle le plus élevé qu'ils ont dans cette liste. Fais glisser les rôles pour les
        réorganiser : les rôles en haut ont plus de pouvoir.
      </p>

      <div className="mt-6 grid grid-cols-[24px_1fr_88px_auto] gap-2 pr-2 pb-2 border-b border-border text-xs font-semibold text-muted-foreground">
        <span />
        <span>Rôles – {sortableRoles.length}</span>
        <span>Membres</span>
        <span className="w-[80px]" />
      </div>
      {sortableRoles.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">Aucun rôle pour l'instant. Crée le premier !</p>
      ) : (
        sortableList
      )}
      <Dialog open={!!roleToDelete} onOpenChange={(o) => !o && setRoleToDelete(null)}>
        <DialogContent className="sm:max-w-[400px] p-6 gap-0">
          <DialogTitle className="text-xl font-semibold text-white">Supprimer le rôle</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted-foreground">
            Tu es sûr(e) de vouloir supprimer le rôle <strong className="text-foreground">{roleToDelete?.name}</strong> ? Cette action est irréversible.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRoleToDelete(null)}>Annuler</Button>
            <Button variant="destructive" onClick={confirmDeleteRole}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </SettingsPage>
  );
}
