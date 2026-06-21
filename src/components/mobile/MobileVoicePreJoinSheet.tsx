import { useState, useEffect } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ChevronDown, ChevronRight, Smartphone, UserPlus } from 'lucide-react';
import { useVoice, useVoiceParticipants } from '@/contexts/VoiceContext';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { MobileVoicePreJoin } from './MobileVoicePreJoin';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: { id: string; name: string } | null;
  serverId: string;
  serverName?: string;
  /** Called once the user has successfully joined; parent should navigate to the connected voice view. */
  onJoined: (channelId: string) => void;
  /** Optional: open the channel chat (text) view from inside the pre-join sheet. */
  onOpenChat?: (channelId: string) => void;
}

export function MobileVoicePreJoinSheet({
  open, onOpenChange, channel, serverId, serverName, onJoined, onOpenChat,
}: Props) {
  const { voiceState, joinChannel, toggleMute } = useVoice();
  const { data: participants = [] } = useVoiceParticipants(channel?.id ?? null);
  const { can } = useMultipleChannelPermissions(channel?.id ?? '', ['connect_voice']);
  const canConnect = can('connect_voice');

  const [isConnecting, setIsConnecting] = useState(false);
  const [preJoinMuted, setPreJoinMuted] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setIsConnecting(false);
      setPreJoinMuted(false);
    }
  }, [open]);

  if (!channel) return null;

  const handleJoin = async () => {
    setIsConnecting(true);
    try {
      await joinChannel(channel.id, channel.name, serverName || voiceState.serverName || 'Server');
      if (preJoinMuted && !voiceState.isMuted) {
        await toggleMute();
      }
      onJoined(channel.id);
      onOpenChange(false);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-3xl bg-[hsl(var(--surface-1))] border-t border-white/5 h-[58vh] max-h-[58vh] [&>button.absolute]:hidden flex flex-col"
        >
          {/* Top bar: collapse + channel name pill + phone + add */}
          <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Réduire"
              className="w-10 h-10 rounded-full bg-[hsl(var(--surface-2))] flex items-center justify-center active:bg-[hsl(var(--surface-3))] transition-colors shrink-0"
            >
              <ChevronDown className="w-5 h-5 text-foreground" />
            </button>

            <div className="flex-1 flex justify-center min-w-0">
              <button
                type="button"
                className="flex items-center gap-1 px-4 h-10 rounded-full bg-[hsl(var(--surface-2))] active:bg-[hsl(var(--surface-3))] transition-colors max-w-full"
              >
                <span className="font-bold text-foreground truncate">{channel.name}</span>
                <ChevronRight className="w-4 h-4 text-foreground shrink-0" />
              </button>
            </div>

            <button
              type="button"
              aria-label="Appel téléphonique"
              className="w-10 h-10 rounded-full bg-[hsl(var(--surface-2))] flex items-center justify-center active:bg-[hsl(var(--surface-3))] transition-colors shrink-0"
            >
              <Smartphone className="w-5 h-5 text-foreground" />
            </button>
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              aria-label="Inviter"
              className="w-10 h-10 rounded-full bg-[hsl(var(--surface-2))] flex items-center justify-center active:bg-[hsl(var(--surface-3))] transition-colors shrink-0"
            >
              <UserPlus className="w-5 h-5 text-foreground" />
            </button>
          </div>

          {/* Pre-join content */}
          <MobileVoicePreJoin
            participantCount={participants.length}
            isMuted={preJoinMuted}
            isConnecting={isConnecting}
            canConnect={canConnect}
            onToggleMuted={() => setPreJoinMuted(v => !v)}
            onJoin={handleJoin}
            onOpenChat={onOpenChat ? () => { onOpenChat(channel.id); onOpenChange(false); } : undefined}
          />
        </SheetContent>
      </Sheet>

      {inviteOpen && (
        <CreateInviteModal
          serverId={serverId}
          channelName={channel.name}
          onClose={() => setInviteOpen(false)}
        />
      )}
    </>
  );
}
