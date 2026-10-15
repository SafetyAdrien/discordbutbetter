import { useCallback, useMemo } from 'react';
import { useTouchReorder } from '@/hooks/useTouchReorder';
import { useReorderChannels } from '@/hooks/useChannels';
import { cn } from '@/lib/utils';
import { GripVertical } from 'lucide-react';
import type { ChannelWithCategory } from '@/hooks/useChannels';

interface MobileChannelReorderProps {
  serverId: string;
  categoryId: string | null;
  channels: ChannelWithCategory[];
  canManageChannels: boolean;
  /** Called with the channel the user tapped (not dragged). */
  onSelect: (channelId: string) => void;
  renderChannel: (channel: ChannelWithCategory) => React.ReactNode;
}

/**
 * Touch reordering for the mobile channel list.
 *
 * The desktop list drags via react-dnd (HTML5 drag events, which touch
 * devices do not produce). This wraps the same rows in a long-press + drop
 * interaction driven by touch events, sharing the existing reorder mutation so
 * the behaviour matches desktop.
 */
export function MobileChannelReorder({
  serverId,
  categoryId,
  channels,
  canManageChannels,
  onSelect,
  renderChannel,
}: MobileChannelReorderProps) {
  const reorder = useReorderChannels();

  const ids = useMemo(() => channels.map((c) => c.id), [channels]);

  const handleReorder = useCallback(
    (fromId: string, toId: string, position: 'before' | 'after') => {
      const current = [...ids];
      const fromIndex = current.indexOf(fromId);
      if (fromIndex === -1) return;

      const [moved] = current.splice(fromIndex, 1);
      let toIndex = current.indexOf(toId);
      if (toIndex === -1) return;
      // Inserting after the target means one position further down.
      if (position === 'after') toIndex += 1;
      current.splice(toIndex, 0, moved);

      reorder.mutate({ serverId, categoryId, orderedIds: current });
    },
    [ids, reorder, serverId, categoryId],
  );

  const { state, handleProps, isDragging, dropIndicator, containerProps } = useTouchReorder({
    items: ids,
    onReorder: handleReorder,
    disabled: !canManageChannels,
  });

  return (
    <div className={cn('space-y-0.5', 'dnd-touch-active', state.activeId && containerProps.style)} data-drag-active={state.activeId ? 'true' : 'false'}>
      {channels.map((channel) => {
        const indicator = dropIndicator(channel.id);
        const dragging = isDragging(channel.id);

        return (
          <div key={channel.id} data-reorder-id={channel.id} className="relative">
            {/* Drop indicator, matching the desktop list's visual language. */}
            {indicator && (
              <div
                className="absolute left-2 right-2 h-0.5 bg-[#5865f2] z-20 pointer-events-none rounded-full"
                style={indicator === 'before' ? { top: -2 } : { bottom: -2 }}
              />
            )}

            <div
              className={cn(
                'flex items-stretch',
                dragging && 'opacity-40',
              )}
            >
              <div className="flex-1 min-w-0">{renderChannel(channel)}</div>

              {canManageChannels && (
                <button
                  type="button"
                  aria-label={`Réordonner ${channel.name}`}
                  className="dnd-touch-handle flex items-center px-1.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                  {...handleProps(channel.id)}
                  onClick={() => onSelect(channel.id)}
                >
                  <GripVertical className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}