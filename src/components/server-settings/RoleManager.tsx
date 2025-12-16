import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useServerRoles, useCreateRole, useDeleteRole, useReorderRoles, useDuplicateRole, useRoleMemberCounts, RoleWithPermissions } from '@/hooks/useRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleEditor } from './RoleEditor';
import { Plus, Shield, Trash2, Loader2, Copy, Users } from 'lucide-react';

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';

interface RoleManagerProps {
  serverId: string;
}

// Role Icon Component
function RoleIcon({ role, size = 'sm' }: { role: RoleWithPermissions; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  if (role.icon_url) {
    // Check if it's an emoji (not a URL)
    if (!role.icon_url.startsWith('http')) {
      return <span className={textSize}>{role.icon_url}</span>;
    }
    return <img src={role.icon_url} alt="" className={cn(sizeClasses, 'object-contain flex-shrink-0')} />;
  }

  return (
    <div
      className={cn(sizeClasses, 'rounded-full flex-shrink-0')}
      style={{ backgroundColor: role.color || '#99AAB5' }}
    />
  );
}

// Drop Indicator Component - Discord style blue line
function DropIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  return <div className="drop-indicator my-0.5" aria-hidden="true" />;
}

// Sortable Role Component
function SortableRole({
  role,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  memberCount,
  showDropBefore,
  showDropAfter,
}: {
  role: RoleWithPermissions;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  memberCount: number;
  showDropBefore?: boolean;
  showDropAfter?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: role.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: isDragging ? undefined : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1)',
  };

  return (
    <>
      <DropIndicator isVisible={showDropBefore ?? false} />
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors group role-transition',
          isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
          isDragging && 'sortable-ghost'
        )}
        onClick={onSelect}
      >
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
      <DropIndicator isVisible={showDropAfter ?? false} />
    </>
  );
}

export function RoleManager({ serverId }: RoleManagerProps) {
  const { data: roles = [], isLoading } = useServerRoles(serverId);
  const { data: memberCounts = {} } = useRoleMemberCounts(serverId);
  const createRole = useCreateRole();
  const deleteRole = useDeleteRole();
  const reorderRoles = useReorderRoles();
  const duplicateRole = useDuplicateRole();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [showNewRoleInput, setShowNewRoleInput] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'after'>('after');

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  // DnD sensors - no activation constraint for immediate grab
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over, delta } = event;
    if (!over || over.id === active.id) {
      setOverId(null);
      return;
    }

    // Calculate drop position based on cursor position
    const overRect = over.rect;
    if (overRect) {
      const activatorEvent = event.activatorEvent as MouseEvent | TouchEvent | null;
      let clientY = 0;
      if (activatorEvent) {
        if ('clientY' in activatorEvent) {
          clientY = activatorEvent.clientY + delta.y;
        } else if ('touches' in activatorEvent && activatorEvent.touches[0]) {
          clientY = activatorEvent.touches[0].clientY + delta.y;
        }
      }
      const middleY = overRect.top + overRect.height / 2;
      setDropPosition(clientY < middleY ? 'before' : 'after');
    }
    setOverId(over.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setOverId(null);

    if (!over || active.id === over.id) return;

    const oldIndex = roles.findIndex(r => r.id === active.id);
    const overIndex = roles.findIndex(r => r.id === over.id);

    if (oldIndex !== -1 && overIndex !== -1) {
      // Calculate precise insertion based on dropPosition
      const activeRole = roles[oldIndex];
      const newRoles = roles.filter(r => r.id !== active.id);
      let insertIndex = dropPosition === 'before' ? overIndex : overIndex + 1;
      
      // Adjust if we removed an element before the insertion point
      if (oldIndex < overIndex) {
        insertIndex--;
      }
      insertIndex = Math.max(0, Math.min(insertIndex, newRoles.length));
      newRoles.splice(insertIndex, 0, activeRole);
      
      reorderRoles.mutate({
        serverId,
        orderedIds: newRoles.map(r => r.id),
      });
    }
  };

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

  const activeRole = activeId ? roles.find(r => r.id === activeId) : null;

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

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={roles.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0.5">
              {roles.map((role) => (
                <SortableRole
                  key={role.id}
                  role={role}
                  isSelected={selectedRoleId === role.id}
                  onSelect={() => setSelectedRoleId(role.id)}
                  onDelete={() => handleDeleteRole(role.id)}
                  onDuplicate={() => handleDuplicateRole(role.id)}
                  memberCount={memberCounts[role.id] || 0}
                  showDropBefore={overId === role.id && dropPosition === 'before'}
                  showDropAfter={overId === role.id && dropPosition === 'after'}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay - Ghost following cursor */}
          <DragOverlay>
            {activeRole && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg drag-overlay-item">
                <RoleIcon role={activeRole} />
                <span className="text-sm font-medium">{activeRole.name}</span>
              </div>
            )}
          </DragOverlay>
        </DndContext>
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