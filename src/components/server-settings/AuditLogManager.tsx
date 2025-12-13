import { useState } from 'react';
import { useAuditLogs, ACTION_TYPES } from '@/hooks/useAuditLogs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Filter, X, Loader2, History, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AuditLogManagerProps {
  serverId: string;
}

export function AuditLogManager({ serverId }: AuditLogManagerProps) {
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: logs = [], isLoading } = useAuditLogs(serverId, {
    actionTypes: selectedActionTypes.length > 0 ? selectedActionTypes : undefined,
  });

  const handleToggleActionType = (actionType: string) => {
    setSelectedActionTypes(prev =>
      prev.includes(actionType)
        ? prev.filter(t => t !== actionType)
        : [...prev, actionType]
    );
  };

  const clearFilters = () => {
    setSelectedActionTypes([]);
    setSearchQuery('');
  };

  const getActionLabel = (actionType: string) => {
    return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType;
  };

  const getActionColor = (actionType: string) => {
    return ACTION_TYPES.find(a => a.value === actionType)?.color || 'text-foreground';
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.actor?.display_name?.toLowerCase().includes(query) ||
      log.actor?.username?.toLowerCase().includes(query) ||
      log.target?.display_name?.toLowerCase().includes(query) ||
      log.target?.username?.toLowerCase().includes(query) ||
      getActionLabel(log.action_type).toLowerCase().includes(query)
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
          Historique des actions de modération sur ce serveur
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par utilisateur..."
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
                <Badge variant="secondary" className="ml-1">
                  {selectedActionTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Type d'action</h4>
              {selectedActionTypes.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={clearFilters}
                >
                  <X className="w-3 h-3 mr-1" />
                  Effacer
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {ACTION_TYPES.map(action => (
                <div
                  key={action.value}
                  className="flex items-center gap-2 py-1 px-1 rounded hover:bg-muted cursor-pointer"
                  onClick={() => handleToggleActionType(action.value)}
                >
                  <Checkbox
                    checked={selectedActionTypes.includes(action.value)}
                    onCheckedChange={() => handleToggleActionType(action.value)}
                  />
                  <span className={cn("text-sm", action.color)}>
                    {action.label}
                  </span>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Filters */}
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

      {/* Logs List */}
      <ScrollArea className="h-[500px]">
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h4 className="text-lg font-medium">Aucun log trouvé</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedActionTypes.length > 0 || searchQuery
                ? 'Essayez de modifier vos filtres'
                : "Les actions de modération apparaîtront ici"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredLogs.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                {/* Actor Avatar */}
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarImage src={log.actor?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {log.actor?.display_name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {log.actor?.display_name || 'Utilisateur inconnu'}
                    </span>
                    <Badge variant="outline" className={cn("text-xs", getActionColor(log.action_type))}>
                      {getActionLabel(log.action_type)}
                    </Badge>
                  </div>

                  {/* Target info */}
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
                      <span className="text-muted-foreground/60">
                        @{log.target.username.toLowerCase()}
                      </span>
                    </div>
                  )}

                  {/* Details */}
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {log.details.reason && `Raison: ${log.details.reason}`}
                      {log.details.role_name && `Rôle: ${log.details.role_name}`}
                    </p>
                  )}

                  {/* Timestamp */}
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
