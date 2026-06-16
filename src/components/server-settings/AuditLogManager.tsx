import { useState, useMemo } from 'react';
import { useAuditLogs, ACTION_TYPES, CATEGORY_LABELS, AuditCategory, AuditLog } from '@/hooks/useAuditLogs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, X, Loader2, History, ArrowRight, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AuditLogManagerProps {
  serverId: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  icon_url: 'Icône',
  banner_url: 'Bannière',
  avatar_url: 'Avatar',
  description: 'Description',
  owner_id: 'Propriétaire',
  secondary_owner_id: 'Second propriétaire',
  is_public: 'Public',
  color: 'Couleur',
  hoist: 'Affiché à part',
  position: 'Position',
  category_id: 'Catégorie',
  channel_id: 'Salon',
  slowmode_seconds: 'Slowmode (s)',
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (typeof v === 'string' && v.length > 40) return v.slice(0, 40) + '…';
  return String(v);
}

function DetailsRenderer({ log }: { log: AuditLog }) {
  const d = log.details ?? {};
  const changes = (d as any).changes as Record<string, { old: unknown; new: unknown }> | undefined;
  const resourceName = (d as any).name || (d as any).role_name || (d as any).channel_name;
  const reason = (d as any).reason as string | undefined;
  const permission = (d as any).permission as string | undefined;
  const preview = (d as any).content_preview as string | undefined;
  const code = (d as any).code as string | undefined;

  return (
    <div className="mt-1 space-y-1">
      {resourceName && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{resourceName}</span>
        </p>
      )}
      {reason && <p className="text-xs text-muted-foreground">Raison : {reason}</p>}
      {permission && <p className="text-xs text-muted-foreground">Permission : <code className="text-foreground">{permission}</code></p>}
      {code && <p className="text-xs text-muted-foreground">Code : <code className="text-foreground">{code}</code></p>}
      {preview && <p className="text-xs text-muted-foreground italic">« {preview} »</p>}
      {changes && Object.keys(changes).length > 0 && (
        <div className="mt-1 space-y-0.5 border-l-2 border-border pl-2">
          {Object.entries(changes).map(([field, diff]) => (
            <p key={field} className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{FIELD_LABELS[field] ?? field}</span> :{' '}
              <span className="line-through opacity-60">{formatValue(diff.old)}</span>
              <ArrowRight className="inline w-3 h-3 mx-1" />
              <span className="text-foreground">{formatValue(diff.new)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function AuditLogManager({ serverId }: AuditLogManagerProps) {
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Set<AuditCategory>>(new Set());

  const { data: logs = [], isLoading, error } = useAuditLogs(serverId, {
    actionTypes: selectedActionTypes.length > 0 ? selectedActionTypes : undefined,
  });

  const grouped = useMemo(() => {
    const map = new Map<AuditCategory, typeof ACTION_TYPES[number][]>();
    for (const a of ACTION_TYPES) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, []);

  const handleToggleActionType = (actionType: string) => {
    setSelectedActionTypes(prev =>
      prev.includes(actionType) ? prev.filter(t => t !== actionType) : [...prev, actionType]
    );
  };

  const toggleCategory = (cat: AuditCategory) => {
    setOpenCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const clearFilters = () => {
    setSelectedActionTypes([]);
    setSearchQuery('');
  };

  const getActionDef = (actionType: string) => ACTION_TYPES.find(a => a.value === actionType);
  const getActionLabel = (actionType: string) => getActionDef(actionType)?.label || actionType;
  const getActionColor = (actionType: string) => getActionDef(actionType)?.color || 'text-foreground';

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.actor?.display_name?.toLowerCase().includes(q) ||
      log.actor?.username?.toLowerCase().includes(q) ||
      log.target?.display_name?.toLowerCase().includes(q) ||
      log.target?.username?.toLowerCase().includes(q) ||
      getActionLabel(log.action_type).toLowerCase().includes(q) ||
      JSON.stringify(log.details ?? {}).toLowerCase().includes(q)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Journal d'audit</h3>
        <p className="text-sm text-muted-foreground">
          Historique des actions effectuées sur ce serveur
        </p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par utilisateur, action, ressource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="w-4 h-4" />
              Filtrer
              {selectedActionTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1">{selectedActionTypes.length}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-3 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">Catégories</h4>
              {selectedActionTypes.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearFilters}>
                  <X className="w-3 h-3 mr-1" />Effacer
                </Button>
              )}
            </div>
            <div className="space-y-1">
              {Array.from(grouped.entries()).map(([cat, actions]) => (
                <Collapsible
                  key={cat}
                  open={openCategories.has(cat)}
                  onOpenChange={() => toggleCategory(cat)}
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted text-sm font-medium">
                    <span>{CATEGORY_LABELS[cat]}</span>
                    <ChevronDown className={cn('w-4 h-4 transition-transform', openCategories.has(cat) && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pl-3 space-y-1 mt-1">
                    {actions.map(action => (
                      <div
                        key={action.value}
                        className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer"
                        onClick={() => handleToggleActionType(action.value)}
                      >
                        <Checkbox
                          checked={selectedActionTypes.includes(action.value)}
                          onCheckedChange={() => handleToggleActionType(action.value)}
                        />
                        <span className={cn('text-sm', action.color)}>{action.label}</span>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {selectedActionTypes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedActionTypes.map(actionType => (
            <Badge
              key={actionType}
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => handleToggleActionType(actionType)}
            >
              {getActionLabel(actionType)}
              <X className="w-3 h-3" />
            </Badge>
          ))}
        </div>
      )}

      <ScrollArea className="h-[500px]">
        {error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h4 className="text-lg font-medium">Accès restreint</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Vous n'avez pas la permission de voir le journal d'audit.
            </p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h4 className="text-lg font-medium">Aucun log trouvé</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedActionTypes.length > 0 || searchQuery
                ? 'Essayez de modifier vos filtres'
                : 'Les actions apparaîtront ici dès que des modifications seront faites'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={log.actor?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {log.actor?.display_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {log.actor?.display_name || 'Système'}
                    </span>
                    <Badge variant="outline" className={cn('text-xs', getActionColor(log.action_type))}>
                      {getActionLabel(log.action_type)}
                    </Badge>
                  </div>

                  {log.target && (
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <ArrowRight className="w-3 h-3" />
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={log.target.avatar_url || undefined} />
                        <AvatarFallback className="text-xs bg-primary/20 text-primary">
                          {log.target.display_name?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{log.target.display_name}</span>
                      <span className="text-muted-foreground/60">@{log.target.username.toLowerCase()}</span>
                    </div>
                  )}

                  <DetailsRenderer log={log} />

                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {format(new Date(log.created_at), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
