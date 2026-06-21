import { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, PanInfo, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Smartphone, UserPlus } from 'lucide-react';
import { useVoice, useVoiceParticipants } from '@/contexts/VoiceContext';
import { useMultipleChannelPermissions } from '@/hooks/useUserChannelPermissions';
import { MobileVoicePreJoin } from './MobileVoicePreJoin';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { MobileVoiceSettingsPanel } from './MobileVoiceSettingsPanel';

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  const y = useMotionValue(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(0);

  useEffect(() => {
    if (!open) {
      setIsConnecting(false);
      setPreJoinMuted(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && sheetRef.current) {
      setSheetHeight(sheetRef.current.offsetHeight);
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

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = sheetHeight * 0.25;
    if (info.offset.y > threshold || info.velocity.y > 500) {
      onOpenChange(false);
    } else {
      y.set(0);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {open && (
        <>
          <motion.div
            key="voice-sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-black/60"
          />
          <motion.div
            key="voice-sheet"
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            drag="y"
            dragConstraints={{ top: 0, bottom: sheetHeight }}
            dragElastic={{ top: 0, bottom: 0 }}
            dragListener={true}
            onDragEnd={handleDragEnd}
            style={{ y }}
            className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-[hsl(var(--surface-1))] border-t border-white/5 h-[32vh] max-h-[32vh] flex flex-col shadow-2xl touch-none"
          >
            {/* Drag handle + top bar */}
            <div className="flex flex-col shrink-0">
              <div className="w-full pt-2 pb-1 flex justify-center">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
              <div className="flex items-center gap-2 px-3 pt-1 pb-2">
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
                    onClick={() => setSettingsOpen(true)}
                    aria-label="Paramètres du salon"
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
          </motion.div>

          <AnimatePresence>
            {settingsOpen && (
              <MobileVoiceSettingsPanel
                channelName={channel.name}
                onClose={() => setSettingsOpen(false)}
                onInvite={() => { setSettingsOpen(false); setInviteOpen(true); }}
              />
            )}
          </AnimatePresence>

          {inviteOpen && (
            <CreateInviteModal
              serverId={serverId}
              channelName={channel.name}
              onClose={() => setInviteOpen(false)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
}
