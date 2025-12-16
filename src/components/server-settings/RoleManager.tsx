import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useServerRoles, useCreateRole, useDeleteRole, useReorderRoles, useDuplicateRole, useRoleMemberCounts, RoleWithPermissions } from '@/hooks/useRoles';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/hooks/useMembers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RoleEditor } from './RoleEditor';
import { Plus, Shield, Trash2, Loader2, Copy, Users, ChevronDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

// DnD Kit imports
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent, UniqueIdentifier } from '@dnd-kit/core';
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

// Discord-style Drop Indicator
function RoleDropIndicator({ isVisible }: { isVisible: boolean }) {
  if (!isVisible) return null;
  return (
    <div 
      className={cn(
        "relative h-[2px] mx-2 my-0.5 rounded-full",
        "bg-[#5865f2] shadow-[0_0_8px_rgba(88,101,242,0.6)]",
        "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
        "before:w-2 before:h-2 before:rounded-full before:bg-[#5865f2]",
        "after:absolute after:right-0 after:top-1/2 after:-translate-y-1/2",
        "after:w-2 after:h-2 after:rounded-full after:bg-[#5865f2]"
      )}
    />
  );
}

// Sortable Role Component
function SortableRole({
  role,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  memberCount,
  showDropIndicator,
  dropPosition,
  canDragAbove,
}: {
  role: RoleWithPermissions;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  memberCount: number;
  showDropIndicator?: boolean;
  dropPosition?: 'before' | 'after';
  canDragAbove?: boolean;
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
    transform: CSS.Transform.toString(transform),
    transition: isDragging 
      ? 'opacity 150ms ease' 
      : 'transform 200ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <>
      {showDropIndicator && dropPosition === 'before' && <RoleDropIndicator isVisible={true} />}
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 group',
          'cursor-grab active:cursor-grabbing',
          isSelected ? 'bg-primary/10 text-primary ring-1 ring-primary/30' : 'hover:bg-muted',
          isDragging && 'bg-muted/20 scale-[0.98]',
          !canDragAbove && 'opacity-50 cursor-not-allowed'
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
      {showDropIndicator && dropPosition === 'after' && <RoleDropIndicator isVisible={true} />}
    </>
  );
}

export function RoleManager({ serverId }: RoleManagerProps) {
  const { user } = useAuth();
  const { data: roles = [], isLoading } = useServerRoles(serverId);
  const { data: memberCounts = {} } = useRoleMemberCounts(serverId);
  const { data: membersData = [] } = useMembers(serverId);
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

  const selectedRole = roles.find(r => r.id === selectedRoleId);

  // Find current user's highest role position
  const currentMember = membersData.find(m => m.user?.id === user?.id);
  const userHighestRolePosition = currentMember?.roles?.reduce((max, role) => {
    const roleData = roles.find(r => r.id === role.id);
    return roleData ? Math.max(max, roleData.position ?? 0) : max;
  }, 0) ?? 0;

  // Check if user can drag a role (can't drag above own highest role)
  const canDragRole = (role: RoleWithPermissions) => {
    // Admins can drag any role
    const isAdmin = currentMember?.roles?.some(r => {
      const roleData = roles.find(rd => rd.id === r.id);
      return roleData?.permissions?.includes('administrator');
    });
    if (isAdmin) return true;
    
    // Can only drag roles below own highest role
    return (role.position ?? 0) < userHighestRolePosition;
  };

  // DnD sensors with 5px activation distance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string;
    const role = roles.find(r => r.id === id);
    
    // Check if user can drag this role
    if (role && !canDragRole(role)) {
      toast.error('Vous ne pouvez pas déplacer un rôle au-dessus du vôtre');
      return;
    }
    
    setActiveId(id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over, delta } = event;
    
    if (!over || over.id === active.id) {
      setOverId(null);
      return;
    }

    // Calculate drop position based on cursor
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

    const activeRole = roles.find(r => r.id === active.id);
    const overRole = roles.find(r => r.id === over.id);

    // Security: Check if target position is allowed
    if (activeRole && overRole) {
      const targetPosition = overRole.position ?? 0;
      
      // Can't move a role above own highest role
      if (targetPosition >= userHighestRolePosition && !canDragRole(activeRole)) {
        toast.error('Vous ne pouvez pas déplacer un rôle au-dessus du vôtre');
        return;
      }
    }

    // Calculate new order with precise insertion
    const oldIndex = roles.findIndex(r => r.id === active.id);
    const overIndex = roles.findIndex(r => r.id === over.id);

    if (oldIndex !== -1 && overIndex !== -1) {
      // Remove active role and insert at precise position
      const reorderedRoles = roles.filter(r => r.id !== active.id);
      let insertIndex = dropPosition === 'before' ? overIndex : overIndex + 1;
      
      // Adjust if we removed an element before the insertion point
      if (oldIndex < overIndex) {
        insertIndex--;
      }
      
      insertIndex = Math.max(0, Math.min(insertIndex, reorderedRoles.length));
      reorderedRoles.splice(insertIndex, 0, roles[oldIndex]);

      reorderRoles.mutate({
        serverId,
        orderedIds: reorderedRoles.map(r => r.id),
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

        {/* Hierarchy warning */}
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground bg-muted/30 rounded-md mb-2">
          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
          <span>Les rôles en haut ont plus de pouvoir</span>
        </div>

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
            <div className="space-y-1">
              {roles.map((role) => (
                <SortableRole
                  key={role.id}
                  role={role}
                  isSelected={selectedRoleId === role.id}
                  onSelect={() => setSelectedRoleId(role.id)}
                  onDelete={() => handleDeleteRole(role.id)}
                  onDuplicate={() => handleDuplicateRole(role.id)}
                  memberCount={memberCounts[role.id] || 0}
                  showDropIndicator={overId === role.id}
                  dropPosition={dropPosition}
                  canDragAbove={canDragRole(role)}
                />
              ))}
            </div>
          </SortableContext>

          {/* Drag Overlay - Semi-transparent ghost */}
          <DragOverlay dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          }}>
            {activeRole && (
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg min-w-[200px]",
                "bg-card/95 backdrop-blur-sm border border-[#5865f2]/50",
                "shadow-[0_10px_30px_rgba(0,0,0,0.3),0_0_0_1px_rgba(88,101,242,0.3)]",
                "scale-105 cursor-grabbing"
              )}>
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