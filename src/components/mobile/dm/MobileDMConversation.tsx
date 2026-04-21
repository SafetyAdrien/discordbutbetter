import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useDMConversations } from '@/hooks/useDMs';
import { useDMMessages, useSendDMMessage, useEditDMMessage, useDeleteDMMessage, type DMMessage } from '@/hooks/useDMMessages';
import { useUnreadCounts } from '@/hooks/useUnreadCounts';
import { useDMCalls } from '@/hooks/useDMCalls';
import { useTypingIndicator, useTypingUsers } from '@/hooks/useTypingIndicator';
import { useDMMessageReactions, useToggleDMReaction } from '@/hooks/useDMReactions';
import { usePinDMMessage, useUnpinDMMessage, useDMPinnedMessages } from '@/hooks/useDMPinnedMessages';
import { usePendingAttachments } from '@/hooks/usePendingAttachments';
import { useVisualViewport } from '@/hooks/useVisualViewport';
import { useSwipeBack } from '@/hooks/useSwipeBack';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { MessageInput } from '@/components/chat/MessageInput';
import { MobileDMHeader } from './MobileDMHeader';
import { MobileMessageBubble, type BubbleMessage } from './MobileMessageBubble';
import { MobileDMMediaGallery } from './MobileDMMediaGallery';
import { DMCallView } from '@/components/dm/DMCallView';
import { AdaptiveSheet } from '@/components/ui/adaptive-sheet';
import { UserProfilePopup } from '@/components/profile/UserProfilePopup';
import { UniversalMessageActions } from '@/components/chat/UniversalMessageActions';
import { Loader2, Bell, BellOff, Image as ImageIcon, Pin, Search, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { useDMLocalSet } from '@/lib/dm-local-prefs';
import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

interface Props {
  conversationId: string;
  onBack: () => void;
}

const BURST_GAP_MS = 5 * 60 * 1000;

function formatDateLabel(d: Date): string {
  const today = new Date();
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  if (isSameDay(d, today)) return "Aujourd'hui";
  if (isSameDay(d, y)) return 'Hier';
  return format(d, 'd MMMM yyyy', { locale: fr });
}

export function MobileDMConversation({ conversationId, onBack }: Props) {
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const swipeBack = useSwipeBack({ onBack });
  const { keyboardHeight, isKeyboardOpen, isInputFocused } = useVisualViewport();

  const [messageInput, setMessageInput] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<DMMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [replyingTo, setReplyingTo] = useState<DMMessage | null>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [] } = useDMConversations();
  const { data: messages = [], isLoading } = useDMMessages(conversationId);
  const sendMessage = useSendDMMessage();
  const editMessage = useEditDMMessage();
  const deleteMessage = useDeleteDMMessage();
  const pinMessage = usePinDMMessage();
  const unpinMessage = useUnpinDMMessage();
  const { data: pinnedMessages = [] } = useDMPinnedMessages(conversationId);
  const { activeCall, startCall, endCall } = useDMCalls(conversationId);
  const { startTyping, stopTyping } = useTypingIndicator(null, conversationId);
  const { data: typingUsers = [] } = useTypingUsers(null, conversationId);
  const { markAsRead } = useUnreadCounts();

  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { data: reactionsData = {} } = useDMMessageReactions(messageIds);
  const toggleReaction = useToggleDMReaction();

  const muted = useDMLocalSet(user?.id, 'muted');
  const isMuted = muted.set.has(conversationId);

  const conversation = conversations.find((c) => c.id === conversationId);
  const participantFromList = conversation?.participants?.[0] ?? null;

  // Fallback fetch when conversation isn't in the cached list yet
  const { data: directParticipant } = useQuery({
    queryKey: ['dm-participant', conversationId, user?.id],
    enabled: !!user && !participantFromList,
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('dm_participants')
        .select(`user:profiles!dm_participants_user_id_fkey (id, username, display_name, avatar_url, status, bio, banner_url, created_at)`)
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data?.user as any) ?? null;
    },
  });

  const participant = participantFromList ?? directParticipant ?? null;
  const isGroup = !!conversation?.is_group;
  const groupSize = (conversation?.participants?.length ?? 0) + 1;

  const displayName = isGroup
    ? conversation?.name || 'Groupe'
    : participant?.display_name || 'Utilisateur';
  const avatarUrl = isGroup ? conversation?.icon_url || null : participant?.avatar_url || null;

  // Mark as read on open + when messages change while open
  useEffect(() => {
    if (conversationId) markAsRead.mutate(conversationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  }, [messages.length, reduced]);

  // Build bubble shape with grouping metadata
  const grouped = useMemo(() => {
    return messages.map((m, idx) => {
      const isOwn = !!user && m.author?.id === user.id;
      const prev = messages[idx - 1] ?? null;
      const next = messages[idx + 1] ?? null;
      const sameAuthorAsPrev =
        prev && prev.author?.id === m.author?.id;
      const sameAuthorAsNext =
        next && next.author?.id === m.author?.id;
      const tPrev = prev?.created_at ? new Date(prev.created_at).getTime() : 0;
      const t = m.created_at ? new Date(m.created_at).getTime() : 0;
      const tNext = next?.created_at ? new Date(next.created_at).getTime() : 0;
      const burstStart = !sameAuthorAsPrev || (t - tPrev) > BURST_GAP_MS;
      const burstEnd = !sameAuthorAsNext || (tNext - t) > BURST_GAP_MS;

      const showDateSeparator =
        !prev ||
        (m.created_at && prev.created_at && !isSameDay(new Date(m.created_at), new Date(prev.created_at)));

      const bubble: BubbleMessage = {
        id: m.id,
        content: m.content,
        createdAt: m.created_at,
        editedAt: m.edited_at,
        isOwn,
        isPending: m.isPending,
        attachments: m.attachments,
        author: m.author
          ? {
              id: m.author.id,
              displayName: m.author.display_name,
              username: m.author.username,
              avatarUrl: m.author.avatar_url,
            }
          : null,
      };

      return {
        raw: m,
        bubble,
        showAvatar: burstEnd, // avatar at bottom of burst (last bubble)
        showAuthorName: burstStart && isGroup && !isOwn,
        isLastOfBurst: burstEnd,
        showDateSeparator,
      };
    });
  }, [messages, user, isGroup]);

  const handleSend = async (
    attachmentsToSend?: { file: File; name: string; description: string; isSpoiler: boolean }[],
  ) => {
    const content = messageInput.trim();
    if (!content && (!attachmentsToSend || attachmentsToSend.length === 0)) return;
    setMessageInput('');
    haptics.light();
    try {
      const pending = (attachmentsToSend || []).map((a) => ({
        id: crypto.randomUUID(),
        file: a.file,
        name: a.name,
        description: a.description,
        isSpoiler: a.isSpoiler,
        previewUrl: URL.createObjectURL(a.file),
      }));
      await sendMessage.mutateAsync({ conversationId, content, attachments: pending });
      stopTyping();
    } catch {
      /* toast handled in hook */
    }
  };

  const handleToggleReaction = (messageId: string, emoji: string, _r: any) => {
    const list = reactionsData[messageId] || [];
    toggleReaction.mutate({ messageId, emoji, currentReactions: list });
  };

  const isMessagePinned = (id: string) => pinnedMessages.some((p) => p.message_id === id);

  const otherTyping = typingUsers.length > 0;

  return (
    <div
      className="absolute inset-0 z-50 bg-background flex flex-col"
      onTouchStart={swipeBack.onTouchStart}
      onTouchMove={swipeBack.onTouchMove}
      onTouchEnd={swipeBack.onTouchEnd}
      style={{ paddingBottom: isKeyboardOpen && isInputFocused ? `${keyboardHeight}px` : undefined }}
    >
      {/* Active call view stays on top of everything */}
      {activeCall && (activeCall.status === 'ringing' || activeCall.status === 'active') && (
        <DMCallView
          call={activeCall}
          participant={participant || null}
          onEndCall={() => endCall.mutate(activeCall.id)}
          isInitiator={activeCall.initiator_id === user?.id}
        />
      )}

      <MobileDMHeader
        onBack={onBack}
        displayName={displayName}
        avatarUrl={avatarUrl}
        status={!isGroup ? (participant?.status as any) : null}
        isGroup={isGroup}
        groupSize={groupSize}
        isTyping={otherTyping}
        hasActiveCall={!!activeCall && activeCall.status === 'active'}
        onOpenInfo={() => setShowInfo(true)}
        onVoiceCall={() => startCall.mutate({ callType: 'voice' })}
        onVideoCall={() => startCall.mutate({ callType: 'video' })}
        onMore={() => setShowMore(true)}
        callsDisabled={startCall.isPending || !!activeCall || isGroup}
      />

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col justify-end min-h-full py-3">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8 py-12">
              <div className="w-16 h-16 rounded-full bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold mb-3">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <h3 className="text-base font-semibold">{displayName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                C'est le début de votre conversation. Dis bonjour 👋
              </p>
            </div>
          ) : (
            grouped.map(({ raw, bubble, showAvatar, showAuthorName, isLastOfBurst, showDateSeparator }) => (
              <div key={raw.id}>
                {showDateSeparator && (
                  <div className="sticky top-0 z-10 my-2 flex items-center justify-center">
                    <span className="px-3 py-1 text-[11px] font-medium text-muted-foreground bg-[hsl(var(--surface-2))]/80 backdrop-blur rounded-full">
                      {formatDateLabel(new Date(raw.created_at || Date.now()))}
                    </span>
                  </div>
                )}
                <MobileMessageBubble
                  message={bubble}
                  showAvatar={showAvatar}
                  showAuthorName={showAuthorName}
                  isLastOfBurst={isLastOfBurst}
                  isGroup={isGroup}
                  reactions={reactionsData[raw.id] || []}
                  currentUserId={user?.id ?? null}
                  onReply={() => {
                    setMessageInput((v) => (v ? v : `> ${raw.content.split('\n')[0]}\n`));
                  }}
                  onLongPress={(m) => {
                    setActionMessage(raw);
                  }}
                  onToggleReaction={handleToggleReaction}
                  onAvatarTap={(uid) => {
                    setProfileUserId(uid);
                    setShowProfile(true);
                  }}
                />
              </div>
            ))
          )}

          {/* Typing indicator bubble */}
          {otherTyping && (
            <div className="px-3 mt-1 flex items-end gap-2">
              <div className="w-8 h-8" aria-hidden />
              <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-[hsl(var(--surface-2))] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:120ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-pulse [animation-delay:240ms]" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-[hsl(var(--surface-1))]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <MessageInput
          value={messageInput}
          onChange={(v) => {
            setMessageInput(v);
            if (v.length > 0) startTyping();
            else stopTyping();
          }}
          onSend={(atts) => handleSend(atts)}
          placeholder={`Message à ${displayName}`}
          isSending={sendMessage.isPending}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          channelId={null}
          channelName={displayName}
          compact
        />
      </div>

      {/* Long-press message actions sheet */}
      <AdaptiveSheet open={!!actionMessage} onOpenChange={(o) => !o && setActionMessage(null)}>
        {actionMessage && (
          <div className="-mt-2">
            <UniversalMessageActions
              isVisible
              isShiftPressed={false}
              isOwnMessage={actionMessage.author?.id === user?.id}
              isPinned={isMessagePinned(actionMessage.id)}
              onReply={() => {
                setMessageInput((v) =>
                  v ? v : `> ${actionMessage.content.split('\n')[0]}\n`,
                );
                setActionMessage(null);
              }}
              onAddReaction={(emoji) => {
                handleToggleReaction(actionMessage.id, emoji, []);
                setActionMessage(null);
              }}
              onCopyLink={() => {
                copyToClipboard(
                  `${window.location.origin}/dm/${conversationId}/${actionMessage.id}`,
                  'Lien copié',
                );
                setActionMessage(null);
              }}
              onCopyId={() => {
                copyToClipboard(uuidToSnowflake(actionMessage.id), 'ID copié');
                setActionMessage(null);
              }}
              onEdit={
                actionMessage.author?.id === user?.id
                  ? () => {
                      setEditingId(actionMessage.id);
                      setEditingValue(actionMessage.content);
                      setActionMessage(null);
                      toast.info("Édition disponible — modifie puis Entrée pour valider");
                    }
                  : undefined
              }
              onDelete={
                actionMessage.author?.id === user?.id
                  ? () => {
                      deleteMessage.mutate({ messageId: actionMessage.id, conversationId });
                      setActionMessage(null);
                    }
                  : undefined
              }
              onPin={() => {
                if (isMessagePinned(actionMessage.id)) {
                  unpinMessage.mutate({ messageId: actionMessage.id, conversationId });
                } else {
                  pinMessage.mutate({ messageId: actionMessage.id, conversationId });
                }
                setActionMessage(null);
              }}
            />
          </div>
        )}
      </AdaptiveSheet>

      {/* More options sheet */}
      <AdaptiveSheet
        open={showMore}
        onOpenChange={setShowMore}
        title="Options"
      >
        <div className="flex flex-col py-1">
          <SheetButton
            icon={Pin}
            label={`Messages épinglés${pinnedMessages.length > 0 ? ` (${pinnedMessages.length})` : ''}`}
            onClick={() => {
              setShowMore(false);
              toast.info('Liste épinglée — bientôt en plein écran');
            }}
          />
          <SheetButton
            icon={ImageIcon}
            label="Médias partagés"
            onClick={() => {
              setShowMore(false);
              setShowMedia(true);
            }}
          />
          <SheetButton
            icon={Search}
            label="Rechercher dans la conversation"
            onClick={() => {
              setShowMore(false);
              toast.info('Recherche — bientôt disponible');
            }}
          />
          <SheetButton
            icon={isMuted ? Bell : BellOff}
            label={isMuted ? 'Réactiver les notifications' : 'Couper les notifications'}
            onClick={() => {
              muted.toggle(conversationId);
              setShowMore(false);
              haptics.medium();
            }}
          />
          <SheetButton
            icon={Trash2}
            label="Archiver la conversation"
            destructive
            onClick={() => {
              setShowMore(false);
              haptics.warning();
              toast.success('Conversation archivée localement');
            }}
          />
        </div>
      </AdaptiveSheet>

      {/* Conversation info / profile sheet */}
      {showInfo && participant && !isGroup && (
        <AdaptiveSheet open={showInfo} onOpenChange={setShowInfo} mobileVariant="fullscreen" title="Profil">
          <div className="p-2">
            <UserProfilePopup
              user={{
                id: participant.id,
                username: participant.username,
                displayName: participant.display_name,
                avatar: participant.avatar_url || undefined,
                banner: participant.banner_url || undefined,
                status: (participant.status as any) || 'offline',
                bio: participant.bio || undefined,
              }}
              open={showInfo}
              onOpenChange={setShowInfo}
            />
          </div>
        </AdaptiveSheet>
      )}

      {/* Standalone profile from avatar tap */}
      {showProfile && profileUserId && (
        <AdaptiveSheet open={showProfile} onOpenChange={setShowProfile} mobileVariant="fullscreen" title="Profil">
          <ProfileLoader userId={profileUserId} onClose={() => setShowProfile(false)} />
        </AdaptiveSheet>
      )}

      {/* Media gallery */}
      <MobileDMMediaGallery
        conversationId={conversationId}
        open={showMedia}
        onOpenChange={setShowMedia}
      />
    </div>
  );
}

function SheetButton({
  icon: Icon,
  label,
  onClick,
  destructive,
}: {
  icon: typeof Bell;
  label: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-2 py-3 rounded-xl text-left active:bg-muted/60 transition-colors min-h-[44px]',
        destructive && 'text-[hsl(var(--destructive))]',
      )}
    >
      <div
        className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center shrink-0',
          destructive ? 'bg-[hsl(var(--destructive))]/10' : 'bg-muted/60',
        )}
      >
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function ProfileLoader({ userId, onClose }: { userId: string; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ['profile-popup', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, banner_url, status, bio')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  if (!data) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <UserProfilePopup
      user={{
        id: data.id,
        username: data.username,
        displayName: data.display_name,
        avatar: data.avatar_url || undefined,
        banner: data.banner_url || undefined,
        status: (data.status as any) || 'offline',
        bio: data.bio || undefined,
      }}
      open={true}
      onOpenChange={(o) => { if (!o) onClose(); }}
    />
  );
}
