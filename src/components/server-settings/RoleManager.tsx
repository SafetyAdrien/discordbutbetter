import { useState, useRef, useCallback, useMemo, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { useServerRoles, useCreateRole, useDeleteRole, useReorderRoles, useDuplicateRole, useRoleMemberCounts, RoleWithPermissions } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleEditor } from './RoleEditor';
import { Plus, Shield, Trash2, Loader2, Copy, Users, AlertTriangle, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
}: {
  role: RoleWithPermissions;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  memberCount: number;
  dropIndicator: 'before' | 'after' | null;
  canDragAbove?: boolean;
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

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging
      ? 'opacity 150ms ease'
      : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {/* Inline drop indicator - before */}
      {dropIndicator === 'before' && (
        <div className="h-[2px] bg-primary rounded-full mx-1 mb-0.5 shadow-[0_0_4px_hsl(var(--primary)/0.5)]" />
      )}

      <div
        className={cn(
          'flex items-center gap-2 px-1 py-1 rounded-lg transition-all duration-150 group',
          isSelected ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'hover:bg-muted',
          isDragging && 'opacity-30',
          isDisabled && 'opacity-50'
        )}
        onClick={onSelect}
      >
        {/* Drag handle - with setActivatorNodeRef + touch-none */}
        <div
          ref={setActivatorNodeRef}
          {...(isDisabled ? {} : { ...attributes, ...listeners })}
          className={cn(
            'flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] flex-shrink-0 touch-none select-none',
            isDisabled
              ? 'cursor-not-allowed text-muted-foreground/20'
              : 'cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors'
          )}
          onPointerDown={(e) => {
            e.stopPropagation();
            const sensorHandler = isDisabled ? undefined : (listeners as any)?.onPointerDown;
            sensorHandler?.(e);
          }}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <RoleIcon role={role} />
        <span className="flex-1 truncate text-sm">{role.name}</span>

        {/* Member count */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-70">
          <Users className="w-3 h-3" />
          <span>{memberCount}</span>
        </div>

        {!role.is_default && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-primary transition-all"
              title="Dupliquer ce rôle"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Inline drop indicator - after */}
      {dropIndicator === 'after' && (
        <div className="h-[2px] bg-primary rounded-full mx-1 mt-0.5 shadow-[0_0_4px_hsl(var(--primary)/0.5)]" />
      )}
    </div>
  );
}

export function RoleManager({ serverId }: RoleManagerProps) {
  const { data: roles = [], isLoading } = useServerRoles(serverId);
  const { data: memberCounts = {} } = useRoleMemberCounts(serverId);
  const { isGod, canDragRole: canDragRolePosition, userHighestRolePosition } = usePermissions(serverId);
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const reorderRoles = useReorderRoles();
  const duplicateRole = useDuplicateRole();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
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

  const handleRoleSelect = useCallback((roleId: string) => {
    if (wasDraggingRef.current) return;
    setSelectedRoleId(roleId);
  }, []);

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    createRole.mutate(
      { serverId, name: newRoleName.trim() },
      {
        onSuccess: () => {
          setNewRoleName('');
          setShowNewRoleInput(false);
        },
      }
    );
  };

  const handleDeleteRole = (roleId: string) => {
    if (selectedRoleId === roleId) {
      setSelectedRoleId(null);
    }
    deleteRole.mutate({ roleId, serverId });
  };

  const handleDuplicateRole = (roleId: string) => {
    duplicateRole.mutate({ roleId, serverId });
  };

  const activeRole = activeId ? sortableRoles.find(r => r.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-full min-h-[400px]">
      {/* Role List */}
      <div className="w-64 flex-shrink-0 space-y-2">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-muted-foreground">
            Rôles — {roles.length}
          </h4>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowNewRoleInput(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showNewRoleInput && (
          <div className="flex gap-2 mb-2">
            <Input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              placeholder="Nom du rôle"
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateRole();
                if (e.key === 'Escape') setShowNewRoleInput(false);
              }}
            />
            <Button
              size="sm"
              onClick={handleCreateRole}
              disabled={!newRoleName.trim() || createRole.isPending}
            >
              {createRole.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        {/* Hierarchy warning */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          <span>Les rôles en haut ont plus de pouvoir</span>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext
            items={sortableRoleIds}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0">
              {sortableRoles.map((role) => (
                <SortableRole
                  key={role.id}
                  role={role}
                  isSelected={selectedRoleId === role.id}
                  onSelect={() => handleRoleSelect(role.id)}
                  onDelete={() => handleDeleteRole(role.id)}
                  onDuplicate={() => handleDuplicateRole(role.id)}
                  memberCount={memberCounts[role.id] || 0}
                  dropIndicator={overId === role.id && activeId !== role.id ? dropPosition : null}
                  canDragAbove={canDragRole(role)}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay - inline DOM to avoid ref issues */}
          <DragOverlay dropAnimation={null}>
            {activeRole && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg min-w-[200px]",
                "bg-card/95 backdrop-blur-sm border border-[#5865f2]/50",
                "shadow-[0_10px_30px_rgba(0,0,0,0.3),0_0_0_1px_rgba(88,101,242,0.3)]",
                "scale-105 cursor-grabbing"
              )}>
                {/* Inline role icon to avoid forwardRef issues in overlay */}
                {activeRole.icon_url ? (
                  activeRole.icon_url.startsWith('http') ? (
                    <img src={activeRole.icon_url} alt="" className="w-3 h-3 object-contain flex-shrink-0" />
                  ) : (
                    <span className="text-sm">{activeRole.icon_url}</span>
                  )
                ) : (
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeRole.color || '#99AAB5' }}
                  />
                )}
                <span className="text-sm font-medium">{activeRole.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>

        {/* @everyone role - always at bottom, not draggable */}
        {defaultRole && (
          <div className="border-t border-border pt-1 mt-1">
            <div
              className={cn(
                'flex items-center gap-2 px-1 py-1 rounded-lg transition-all duration-150',
                selectedRoleId === defaultRole.id ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'hover:bg-muted',
                'opacity-70'
              )}
              onClick={() => handleRoleSelect(defaultRole.id)}
            >
              <div className="flex items-center justify-center w-8 h-8 min-h-[44px] min-w-[44px] flex-shrink-0 cursor-not-allowed text-muted-foreground/20">
                <GripVertical className="w-3.5 h-3.5" />
              </div>
              <RoleIcon role={defaultRole} />
              <span className="flex-1 truncate text-sm">{defaultRole.name}</span>
              <div className="flex items-center gap-1 text-xs text-muted-foreground opacity-70">
                <Users className="w-3 h-3" />
                <span>{memberCounts[defaultRole.id] || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Role Editor */}
      <div className="flex-1 border-l border-border pl-6">
        {selectedRole ? (
          <RoleEditor role={selectedRole} serverId={serverId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Shield className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Sélectionnez un rôle</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choisissez un rôle pour modifier ses permissions
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
