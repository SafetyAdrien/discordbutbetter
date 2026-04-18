import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckSquare, Square, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useMessageReactions,
  useRemoveReaction,
  useRemoveSpecificReaction,
  useClearMessageReactions,
  Reaction,
} from '@/hooks/useReactions';

interface ReactionsViewerModalProps {
  messageId: string | null;
  canManageReactions?: boolean;
  initialEmoji?: string | null;
  onOpenChange: (open: boolean) => void;
}

const ALL_TAB = '__all__';

export function ReactionsViewerModal({
  messageId,
  canManageReactions = false,
  initialEmoji = null,
  onOpenChange,
}: ReactionsViewerModalProps) {
  const { user } = useAuth();
  const open = !!messageId;
  const ids = useMemo(() => (messageId ? [messageId] : []), [messageId]);
  const { data: reactionsMap } = useMessageReactions(ids);
  const reactions = (messageId && reactionsMap?.[messageId]) || [];

  const removeOwn = useRemoveReaction();
  const removeSpecific = useRemoveSpecificReaction();
  const clearReactions = useClearMessageReactions();

  const [activeTab, setActiveTab] = useState<string>(ALL_TAB);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setActiveTab(ALL_TAB);
      setSelectMode(false);
      setSelected(new Set());
    }
  }, [open]);

  // Group by emoji
  const byEmoji = useMemo(() => {
    const map = new Map<string, Reaction[]>();
    reactions.forEach(r => {
      if (!map.has(r.emoji)) map.set(r.emoji, []);
      map.get(r.emoji)!.push(r);
    });
    return map;
  }, [reactions]);

  const tabs = useMemo(() => Array.from(byEmoji.entries()), [byEmoji]);

  // Visible reactions for current tab
  const visible = useMemo(() => {
    if (activeTab === ALL_TAB) return reactions;
    return byEmoji.get(activeTab) || [];
  }, [activeTab, reactions, byEmoji]);

  const userIds = useMemo(() => Array.from(new Set(visible.map(r => r.user_id))), [visible]);

  const { data: profiles } = useQuery({
    queryKey: ['reaction-viewer-profiles', userIds.sort().join(',')],
    queryFn: async () => {
      if (userIds.length === 0) return {};
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .in('id', userIds);
      if (error) throw error;
      const map: Record<string, { display_name: string; username: string; avatar_url: string | null }> = {};
      data?.forEach(p => {
        map[p.id] = { display_name: p.display_name, username: p.username, avatar_url: p.avatar_url };
      });
      return map;
    },
    enabled: open && userIds.length > 0,
  });

  // Auto-close if no reactions left
  useEffect(() => {
    if (open && reactions.length === 0) {
      onOpenChange(false);
    }
  }, [reactions.length, open, onOpenChange]);

  // Switch tab if current tab has no reactions
  useEffect(() => {
    if (activeTab !== ALL_TAB && !byEmoji.has(activeTab)) {
      setActiveTab(ALL_TAB);
    }
  }, [activeTab, byEmoji]);

  const toggleSelect = (key: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleRemoveSelected = async () => {
    if (!messageId) return;
    const items = Array.from(selected).map(k => {
      const [userId, ...emojiParts] = k.split('|');
      return { userId, emoji: emojiParts.join('|') };
    });
    await Promise.all(
      items.map(({ userId, emoji }) =>
        removeSpecific.mutateAsync({ messageId, userId, emoji }),
      ),
    );
    setSelected(new Set());
    setSelectMode(false);
  };

  const handleClearTab = () => {
    if (!messageId) return;
    if (activeTab === ALL_TAB) {
      clearReactions.mutate({ messageId });
    } else {
      clearReactions.mutate({ messageId, emoji: activeTab });
    }
  };

  const handleSelfRemove = (emoji: string) => {
    if (!messageId) return;
    removeOwn.mutate({ messageId, emoji });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border/50">
          <DialogTitle className="text-base font-semibold">Réactions</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-3 pt-2 pb-2 border-b border-border/30 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab(ALL_TAB)}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium transition-colors flex-shrink-0',
              activeTab === ALL_TAB
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            Tous <span className="tabular-nums">{reactions.length}</span>
          </button>
          {tabs.map(([emoji, list]) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setActiveTab(emoji)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-sm transition-colors flex-shrink-0',
                activeTab === emoji
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              <span className="leading-none">{emoji}</span>
              <span className="text-xs tabular-nums">{list.length}</span>
            </button>
          ))}
        </div>

        {/* Mod toolbar */}
        {canManageReactions && (
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30 bg-muted/20">
            <Button
              size="sm"
              variant={selectMode ? 'secondary' : 'ghost'}
              className="h-7 text-xs gap-1.5"
              onClick={() => {
                setSelectMode(s => !s);
                setSelected(new Set());
              }}
            >
              {selectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
              {selectMode ? 'Annuler' : 'Sélectionner'}
            </Button>
            {selectMode && selected.size > 0 && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs gap-1.5"
                onClick={handleRemoveSelected}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Retirer ({selected.size})
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs gap-1.5 ml-auto text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleClearTab}
            >
              <Trash2 className="w-3.5 h-3.5" />
              {activeTab === ALL_TAB ? 'Tout effacer' : 'Effacer cet emoji'}
            </Button>
          </div>
        )}

        {/* User list */}
        <ScrollArea className="max-h-[60vh]">
          <div className="p-2">
            {visible.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-8">Aucune réaction</div>
            ) : (
              <ul className="space-y-0.5">
                {visible.map(r => {
                  const profile = profiles?.[r.user_id];
                  const isSelf = r.user_id === user?.id;
                  const key = `${r.user_id}|${r.emoji}`;
                  return (
                    <li
                      key={`${r.id}-${r.emoji}`}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {selectMode && canManageReactions && (
                        <Checkbox
                          checked={selected.has(key)}
                          onCheckedChange={() => toggleSelect(key)}
                        />
                      )}
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={profile?.avatar_url ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {profile?.display_name?.charAt(0).toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        {profile ? (
                          <>
                            <div className="text-sm font-medium truncate">{profile.display_name}</div>
                            <div className="text-xs text-muted-foreground truncate">@{profile.username}</div>
                          </>
                        ) : (
                          <Skeleton className="h-4 w-24" />
                        )}
                      </div>
                      {activeTab === ALL_TAB && (
                        <span className="text-base leading-none">{r.emoji}</span>
                      )}
                      {isSelf && !selectMode && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleSelfRemove(r.emoji)}
                          aria-label="Retirer ma réaction"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
