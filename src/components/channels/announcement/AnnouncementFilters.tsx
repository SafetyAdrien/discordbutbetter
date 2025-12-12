import { Plus, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AnnouncementCategory {
  id: string;
  name: string;
  color: string;
  icon?: string;
  count?: number;
}

interface AnnouncementFiltersProps {
  categories: AnnouncementCategory[];
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  onManageCategories: () => void;
  canManage?: boolean;
}

const DEFAULT_CATEGORIES: AnnouncementCategory[] = [
  { id: 'updates', name: 'Mises à jour', color: '#3b82f6', icon: '🔄' },
  { id: 'events', name: 'Événements', color: '#8b5cf6', icon: '🎉' },
  { id: 'maintenance', name: 'Maintenance', color: '#f59e0b', icon: '🔧' },
  { id: 'important', name: 'Important', color: '#ef4444', icon: '⚠️' },
  { id: 'community', name: 'Communauté', color: '#10b981', icon: '💬' },
];

export function AnnouncementFilters({
  categories = DEFAULT_CATEGORIES,
  activeFilter,
  onFilterChange,
  onManageCategories,
  canManage = false,
}: AnnouncementFiltersProps) {
  const allCategories = categories.length > 0 ? categories : DEFAULT_CATEGORIES;

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border overflow-x-auto scrollbar-hide">
      <Badge
        variant={activeFilter === 'all' ? 'default' : 'outline'}
        className={cn(
          'cursor-pointer transition-all shrink-0',
          activeFilter === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'hover:bg-primary/20'
        )}
        onClick={() => onFilterChange('all')}
      >
        Toutes
      </Badge>

      {allCategories.map((cat) => (
        <Badge
          key={cat.id}
          className={cn(
            'cursor-pointer transition-all shrink-0 gap-1.5 border',
            activeFilter === cat.id
              ? 'text-white'
              : 'bg-transparent hover:opacity-80'
          )}
          style={{
            backgroundColor: activeFilter === cat.id ? cat.color : `${cat.color}15`,
            borderColor: `${cat.color}40`,
            color: activeFilter === cat.id ? 'white' : cat.color,
          }}
          onClick={() => onFilterChange(cat.id)}
        >
          {cat.icon && <span>{cat.icon}</span>}
          <span>{cat.name}</span>
          {cat.count !== undefined && (
            <span className="opacity-70 text-xs">({cat.count})</span>
          )}
        </Badge>
      ))}

      {canManage && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-6 w-6 p-0"
          onClick={onManageCategories}
        >
          <Settings2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export { DEFAULT_CATEGORIES };
