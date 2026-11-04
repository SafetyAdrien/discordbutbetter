import { ThreadsModal } from '@/components/threads/ThreadsModal';
import type { ReminderTarget } from '@/hooks/useReminders';
import React, { useState, forwardRef, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Message, Channel, User } from "@/types/app";
import { cn } from "@/lib/utils";
import { uuidToSnowflake } from "@/lib/snowflake";
import { messageMentionsMe } from "@/lib/mention-detection";
import { MessageSquareText, BellRing, SmilePlus, StopCircle } from "lucide-react";
import { Hash, Bell, Pin, Users, Reply, Pencil, Trash2, BellOff, AtSign, X, Check, Link, MoreHorizontal } from "@/components/icons/discord/lucide";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";
import {
  ChannelFollowedSystemMessage,
  PublishActionButton,
  PublishConfirmDialog,
  PublishPrompt,
  PublishedAuthorName,
  PublishedAvatar,
} from "@/components/announcements/AnnouncementBits";
import { FollowChannelModal } from "@/components/channels/announcement/FollowChannelModal";
import { FollowSuccessModal } from "@/components/channels/announcement/FollowSuccessModal";
import { AnnouncementComposer } from "@/components/channels/announcement/AnnouncementComposer";
import { useChannelFollowers, useDismissPublishPrompt, usePublishMessage } from "@/hooks/useChannelFollowers";
import { PollClosedSystemMessage } from "@/components/chat/PollClosedSystemMessage";
import { CHANNEL_FOLLOWED_RE, POLL_CLOSED_RE } from "@/lib/announcements";
import { DiscordRules } from "@/components/icons/DiscordRules";
import { MessageListSkeleton } from "@/components/chat/MessageListSkeleton";
import StreamlineSummaries from "@/components/icons/StreamlineSummaries";
import { UniversalMessageActions } from "@/components/chat/UniversalMessageActions";
import { UniversalMessageContextMenu } from "@/components/chat/UniversalMessageContextMenu";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownTextarea } from "@/components/chat/MarkdownTextarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserProfilePopup } from "@/components/profile/UserProfilePopup";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { copyToClipboard } from "@/lib/clipboard";
import { useAuth } from "@/contexts/AuthContext";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/typing/TypingIndicator";
import { MarkdownText, setMarkdownContext } from "@/lib/markdown";
import { registerSnowflakeMappings } from "@/lib/snowflake";
import { useEditMessage, useDeleteMessage } from "@/hooks/useMessages";
import { usePinnedMessages, usePinMessage, useUnpinMessage } from "@/hooks/usePinnedMessages";
import {
  useMessageReactions,
  useAddReaction,
  useRemoveReaction,
  useClearMessageReactions,
  Reaction,
} from "@/hooks/useReactions";
import { ReactionsViewerModal } from "@/components/chat/ReactionsViewerModal";
import { Eye } from "lucide-react";
import { usePolls, useDeletePoll, useEndPoll, Poll } from "@/hooks/usePolls";
import { useThreads, useUpdateThread, useDeleteThread } from "@/hooks/useThreads";
import { useServerRoles } from "@/hooks/useRoles";
import { useChannels } from "@/hooks/useChannels";
import { useServers } from "@/hooks/useServers";
import { useQueryClient } from "@tanstack/react-query";
import { CreateInviteModal } from "@/components/modals/CreateInviteModal";
import { LazyServerWelcomeChecklist as ServerWelcomeChecklist } from "@/components/lazy/LazyModals";
import { useServerSetupProgress, useFirstTextChannelId, firstMessageQueryKey } from "@/hooks/useServerSetupProgress";
import { AgeGate, RulesGate } from "./ServerGates";
import { useServerSettings } from "@/hooks/useServerSettings";
import { Thread } from "@/types/thread";
import { PollDisplay } from "./PollDisplay";
import { ClosePollConfirmDialog } from "./ClosePollConfirmDialog";
import { CreatePollModal } from "./CreatePollModal";
import StreamlineThreads from "@/components/icons/StreamlineThreads";
import ThreadsPopover from "@/components/threads/ThreadsPopover";
import { openNewThread } from "@/lib/threadEvents";
import { ServerTagBadge } from '@/components/server-tags/ServerTagBadge';
import { ThreadSpine } from "@/components/threads/ThreadSpine";
import { SwipeToReplyRow } from "@/components/mobile/SwipeToReplyRow";
import { ThreadSystemMessage } from "@/components/threads/ThreadSystemMessage";
import { ViewThreadButton } from "@/components/threads/ViewThreadButton";
import { MessageInput } from "@/components/chat/MessageInput";
import { ReportModal } from "@/components/chat/ReportModal";
import { RoleBadgePopover } from "@/components/chat/RoleBadgePopover";
import { DeleteMessageDialog } from "./DeleteMessageDialog";
import { useSummaries } from "@/hooks/useSummaries";
import { useMarkChannelAsRead } from "@/hooks/useMarkChannelAsRead";
import { SummariesBar } from "@/components/summaries/SummariesBar";
import { UploadDropOverlay } from "@/components/chat/upload/UploadDropOverlay";
import { usePendingAttachments, PendingAttachment } from "@/hooks/usePendingAttachments";
import { MessageAttachments, StoredAttachment } from "@/components/chat/MessageAttachments";
import { ForwardedFrame } from "@/components/chat/ForwardedFrame";
import { toast } from "sonner";
import { EditableAttachments } from "@/components/chat/EditableAttachments";
import { AttachmentEditsPanel, useAttachmentEdits } from "@/components/chat/upload/AttachmentEditsPanel";
import { useForwardedFrom } from "@/hooks/useForwardedFrom";
import { useMarkMessageUnread } from "@/hooks/useMarkMessageUnread";
import { openForwardMessage } from "@/lib/forwardMessage";
import { JUMP_TO_MESSAGE_EVENT } from "@/lib/threadEvents";
import { useHasChannelPermission, useMultipleChannelPermissions } from "@/hooks/useUserChannelPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { LazyChannelSettingsModal as ChannelSettingsModal } from "@/components/lazy/LazyModals";
import { SmartLinkEmbeds as LinkEmbeds } from "@/components/chat/embeds";
import { useChannelDetails } from "@/hooks/useChannelSettings";
import { extractUrls, fetchMetadata } from "@/hooks/useUrlMetadata";
import { isInviteUrl } from "@/lib/invites";
import { formatClock } from "@/lib/userSettings";
import { useEphemeralMessages } from "@/lib/ephemeralMessages";
import { EphemeralMessageRow } from "@/components/chat/slash/EphemeralMessageRow";
import { ClydeProfileCard } from "@/components/chat/slash/ClydeProfileCard";
import { useUserSettingsValue } from "@/hooks/useUserSettings";
import { CommunitySystemMessage, COMMUNITY_SYSTEM_RE } from "@/components/chat/CommunitySystemMessage";
import { MobilePollActions } from "@/components/mobile/MobilePollActions";
import { ReactionBar } from "@/components/chat/ReactionBar";
import { RepliedLine } from "@/components/chat/RepliedLine";

import { ReplyBanner } from "@/components/chat/ReplyBanner";
import { withReplyMention } from "@/lib/replyMention";

import { appLocale } from '@/i18n/locale';
import { ChannelSheetIcon } from "@/components/icons/ChannelSheetIcon";
// Quick reactions - exactement 3 émojis les plus populaires pour le hover standard
const QUICK_REACTIONS_HOVER = ["👍", "❤️", "😂"];


interface Role {
  id: string;
  name: string;
  color: string | null;
  position: number | null;
  icon_url?: string | null;
  description?: string | null;
}
interface ChatAreaProps {
  channel: Channel;
  messages: Message[];
  onSendMessage: (content: string, attachments?: PendingAttachment[], replyToId?: string | null, externalAttachment?: { url: string; name: string; type: 'sticker' | 'gif' }) => void;
  memberRoles?: Map<string, Role[]>;
  onOpenDM?: (conversationId: string) => void;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  onSelectThread?: (threadId: string) => void;
  activeThreadId?: string | null;
  onCloseThread?: () => void;
  members?: Array<{ id: string; memberId?: string; displayName: string; username: string; avatar?: string; bio?: string }>;
  onChannelSelect?: (channelId: string) => void;
  onLoadOlder?: () => Promise<number>;
  hasMoreOlder?: boolean;
  /** Premier chargement des messages : squelette comme Discord. */
  messagesLoading?: boolean;
  /** Ouvre les parametres du serveur sur un onglet (checklist du nouveau serveur). */
  onOpenServerSettings?: (tab?: string) => void;
}
// Long-press wrapper for polls on mobile
function PollLongPressWrapper({
  isMobile,
  onLongPress,
  className,
  children,
  ...divProps
}: {
  isMobile: boolean;
  onLongPress: () => void;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouchStart = () => {
    if (!isMobile) return;
    timerRef.current = setTimeout(() => {
      onLongPress();
    }, 500);
  };

  const handleTouchEnd = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchEnd}
      {...divProps}
    >
      {children}
    </div>
  );
}

// Respecte le format 12/24 h de Langue et heure.
const formatTime = formatClock;
function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Hier";
  }
  return date.toLocaleDateString(appLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
export const ChatArea = forwardRef<HTMLDivElement, ChatAreaProps>(function ChatArea(
  {
    channel,
    messages,
    onSendMessage,
    memberRoles,
    onOpenDM,
    onToggleMembers,
    showMembers = true,
    onSelectThread,
    activeThreadId,
    onCloseThread,
    members = [],
    onChannelSelect,
    onLoadOlder,
    hasMoreOlder = false,
    messagesLoading = false,
    onOpenServerSettings,
  },
  ref,
) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const isTablet = typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1024;
  const navigate = useNavigate();
  const [messageInput, setMessageInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    user: User;
    roles?: Role[];
  } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [hoveredPollId, setHoveredPollId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [createThreadForMessageId, setCreateThreadForMessageId] = useState<string | null>(null);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [threadsModalOpen, setThreadsModalOpen] = useState(false);
  // "Creer un fil" depuis le menu d'un message : ouvre le panneau "Nouveau fil" (messageId = message d'origine).
  useEffect(() => {
    if (!createThreadForMessageId) return;
    openNewThread(channel.id, createThreadForMessageId);
    setCreateThreadForMessageId(null);
  }, [createThreadForMessageId, channel.id]);
  const [editingPoll, setEditingPoll] = useState<Poll | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [openDropdownPollId, setOpenDropdownPollId] = useState<string | null>(null);
  const [mobilePollSheetId, setMobilePollSheetId] = useState<string | null>(null);
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [pendingContextDeleteMessageId, setPendingContextDeleteMessageId] = useState<string | null>(null);
  const [reactionsViewerMessageId, setReactionsViewerMessageId] = useState<string | null>(null);
  const [reactionsViewerInitialEmoji, setReactionsViewerInitialEmoji] = useState<string | null>(null);
  const clearMessageReactions = useClearMessageReactions();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);
  const wasAtBottomRef = useRef(true);
  const editingMessageIdRef = useRef<string | null>(null);
  const editingTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const hasFocusedEditTextareaRef = useRef(false);
  const editScrollLockRef = useRef<{
    top: number;
    messageId: string | null;
    anchorId: string | null;
    anchorTop: number | null;
    rafIds: number[];
    timeoutId: number | null;
  } | null>(null);
  const [showJumpToBottom, setShowJumpToBottom] = useState(false);

  const releaseEditScrollLock = useCallback(() => {
    const lock = editScrollLockRef.current;
    lock?.rafIds.forEach((rafId) => cancelAnimationFrame(rafId));
    if (lock?.timeoutId) window.clearTimeout(lock.timeoutId);
    const vp = scrollViewportRef.current;
    if (vp) vp.style.overflowAnchor = "";
    editScrollLockRef.current = null;
  }, []);

  const resizeEditTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    const maxHeight = Math.min(320, Math.max(180, Math.floor(window.innerHeight * 0.45)));
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, []);

  const setEditingTextareaNode = useCallback(
    (el: HTMLTextAreaElement | null) => {
      editingTextareaRef.current = el;
      resizeEditTextarea(el);
    },
    [resizeEditTextarea],
  );

  const editTextareaClass =
    "bg-[hsl(var(--surface-3))] border-border/60 min-h-[44px] max-h-[45vh] md:max-h-[320px] resize-none overflow-x-hidden pr-5 whitespace-pre-wrap break-words font-ginto leading-[1.375rem] text-foreground [overflow-wrap:anywhere] [word-break:break-word] [scrollbar-gutter:stable]";

  // Pending attachments for drag & drop
  const {
    attachments,
    isDragging,
    addFiles,
    removeAttachment,
    updateAttachment,
    toggleSpoiler,
    clearAttachments,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  } = usePendingAttachments();

  const scrollToBottom = useCallback((smooth = true) => {
    releaseEditScrollLock();
    if (editingMessageIdRef.current) {
      editingTextareaRef.current?.blur();
    }
    const vp = scrollViewportRef.current;
    if (!vp) return;
    wasAtBottomRef.current = true;
    setShowJumpToBottom(false);
    vp.scrollTo({ top: vp.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, [releaseEditScrollLock]);

  const restoreEditScrollLock = useCallback(() => {
    const vp = scrollViewportRef.current;
    const lock = editScrollLockRef.current;
    if (!vp || !lock) return;
    const anchor = lock.anchorId ? messageRefs.current.get(lock.anchorId) : null;
    if (anchor && lock.anchorTop !== null) {
      const currentTop = anchor.getBoundingClientRect().top - vp.getBoundingClientRect().top;
      vp.scrollTop += currentTop - lock.anchorTop;
      return;
    }
    vp.scrollTop = lock.top;
  }, []);

  const lockScrollForEditTransition = useCallback((messageId: string | null = editingMessageIdRef.current) => {
    const vp = scrollViewportRef.current;
    if (!vp) return;

    const previousLock = editScrollLockRef.current;
    previousLock?.rafIds.forEach((rafId) => cancelAnimationFrame(rafId));
    if (previousLock?.timeoutId) window.clearTimeout(previousLock.timeoutId);

    const vpRect = vp.getBoundingClientRect();
    const anchorId = messageId;
    const anchor = anchorId ? messageRefs.current.get(anchorId) : null;
    const anchorTop = anchor ? anchor.getBoundingClientRect().top - vpRect.top : null;

    const lock = {
      top: vp.scrollTop,
      messageId,
      anchorId,
      anchorTop,
      rafIds: [] as number[],
      timeoutId: null as number | null,
    };
    editScrollLockRef.current = lock;
    editingMessageIdRef.current = messageId;
    vp.style.overflowAnchor = "none";
  }, []);

  // Track scroll position to detect "at bottom" and stabilize on resize
  const loadingOlderRef = useRef(false);
  useEffect(() => {
    const vp = chatContainerRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    if (!vp) return;
    scrollViewportRef.current = vp;

    const computeAtBottom = () => {
      const distanceFromBottom = vp.scrollHeight - vp.scrollTop - vp.clientHeight;
      const atBottom = distanceFromBottom < 24;
      wasAtBottomRef.current = atBottom;
      // Bouton "Aller en bas" : visible uniquement avec ≥50 messages et distance > 150px
      setShowJumpToBottom(messages.length >= 50 && distanceFromBottom > 150);

      // Infinite scroll: load older messages when near the top
      if (
        onLoadOlder &&
        hasMoreOlder &&
        !loadingOlderRef.current &&
        vp.scrollTop < 200 &&
        messages.length > 0
      ) {
        loadingOlderRef.current = true;
        const prevHeight = vp.scrollHeight;
        const prevTop = vp.scrollTop;
        void onLoadOlder().then((added) => {
          requestAnimationFrame(() => {
            if (added && added > 0 && scrollViewportRef.current) {
              const delta = scrollViewportRef.current.scrollHeight - prevHeight;
              scrollViewportRef.current.scrollTop = prevTop + delta;
            }
            loadingOlderRef.current = false;
          });
        });
      }
    };
    computeAtBottom();

    vp.addEventListener('scroll', computeAtBottom, { passive: true });

    const content = vp.firstElementChild as HTMLElement | null;
    const ro = new ResizeObserver(() => {
      if (editingMessageIdRef.current) {
        return;
      }
      if (editScrollLockRef.current) {
        restoreEditScrollLock();
        return;
      }
      if (wasAtBottomRef.current) {
        vp.scrollTop = vp.scrollHeight;
      }
    });
    if (content) ro.observe(content);

    return () => {
      vp.removeEventListener('scroll', computeAtBottom);
      ro.disconnect();
    };
  }, [channel.id, restoreEditScrollLock, messages.length, onLoadOlder, hasMoreOlder]);


  // Auto-scroll to bottom on new messages, only if user was at bottom and not editing
  useEffect(() => {
    if (editingMessageIdRef.current) return;
    if (wasAtBottomRef.current) {
      scrollToBottom(true);
    }
  }, [messages.length, scrollToBottom]);

  // Stabiliser la position de scroll à l'entrée/sortie du mode édition
  // (les blocs de code remplacés par un textarea changent la hauteur du contenu)
  useLayoutEffect(() => {
    editingMessageIdRef.current = editingMessageId;
    hasFocusedEditTextareaRef.current = false;
    const vp = scrollViewportRef.current;
    const lock = editScrollLockRef.current;
    if (!vp || !lock) return;
    if (editingMessageId) {
      releaseEditScrollLock();
      return;
    }

    vp.scrollTop = lock.top;
    const raf1 = requestAnimationFrame(() => {
      restoreEditScrollLock();
      const raf2 = requestAnimationFrame(restoreEditScrollLock);
      lock.rafIds.push(raf2);
    });
    lock.rafIds.push(raf1);
    lock.timeoutId = window.setTimeout(() => {
      restoreEditScrollLock();
      vp.style.overflowAnchor = "";
      editScrollLockRef.current = null;
    }, 80);

    return () => {
      lock.rafIds.forEach((rafId) => cancelAnimationFrame(rafId));
      if (lock.timeoutId) window.clearTimeout(lock.timeoutId);
    };
  }, [editingMessageId, releaseEditScrollLock, restoreEditScrollLock]);



  // SHIFT key detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") setIsShiftPressed(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);
  const { user } = useAuth();
  const attachmentEdits = useAttachmentEdits();
  const { startTyping, stopTyping } = useTypingIndicator(channel.id, null);
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  const deletePoll = useDeletePoll();
  const endPollMutation = useEndPoll();

  // Channel details (for slowmode)
  const { data: channelDetails } = useChannelDetails(channel.id);

  // Fetch server roles and channels for markdown context
  const { data: serverRoles = [] } = useServerRoles(channel.server_id);
  const { data: channelsData } = useChannels(channel.server_id);

  // Checklist "Bienvenue sur <serveur>" : proprietaire uniquement, dans le
  // premier salon textuel (salons hors categorie d'abord, comme la liste).
  const { data: allServers = [] } = useServers();
  const currentServer = allServers.find((s) => s.id === channel.server_id);
  const buildReminder = (m: Message): ReminderTarget => ({
    source: 'channel',
    messageId: m.id,
    channelId: channel.id,
    serverId: channel.server_id ?? null,
    snapshot: {
      authorId: m.author.id,
      authorName: m.author.displayName,
      authorAvatar: m.author.avatar ?? null,
      content: m.content,
      createdAt: m.timestamp.toISOString(),
      imageUrl: m.attachments?.find((a) => /^image\//.test(a.type ?? '') || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(a.url ?? ''))?.url ?? null,
      channelName: channel.name,
      serverName: currentServer?.name ?? null,
      serverIcon: currentServer?.icon_url ?? null,
      categoryName: channelsData?.categories.find((c) => c.channels.some((ch) => ch.id === channel.id))?.name ?? null,
    },
  });
  // Salon d'annonces : bouton Suivre, publication vers les salons abonnes.
  const isAnnouncement = channel.type === "announcement";
  const { data: announcementFollowers = [] } = useChannelFollowers(isAnnouncement ? channel.id : null);
  const publishMessage = usePublishMessage();
  const dismissPublish = useDismissPublishPrompt();
  const [publishConfirmId, setPublishConfirmId] = useState<string | null>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followSuccessOpen, setFollowSuccessOpen] = useState(false);
  const [richAnnouncementOpen, setRichAnnouncementOpen] = useState(false);
  const firstTextChannelId = useFirstTextChannelId(channel.server_id ?? null);
  // Etat partage avec la ligne "Progression de la configuration" de la
  // liste des salons (serveur recent, proprietaire uniquement).
  const queryClient = useQueryClient();
  const setup = useServerSetupProgress(channel.server_id ?? null);
  const [checklistInviteOpen, setChecklistInviteOpen] = useState(false);
  const showChecklist = setup.visible && firstTextChannelId === channel.id;
  // Premier message envoye : l'etape passe tout de suite a "terminee", sans
  // attendre la requete du hook (la checklist et l'en-tete avancent ensemble).
  const ownMessageSent = !!user && messages.some((m) => !m.is_system && m.author?.id === user.id);
  useEffect(() => {
    if (setup.eligible && ownMessageSent && !setup.done.message) {
      queryClient.setQueryData(firstMessageQueryKey(channel.server_id ?? null, user?.id), true);
    }
  }, [setup.eligible, setup.done.message, ownMessageSent, queryClient, channel.server_id, user?.id]);
  const { data: serverAccess } = useServerSettings(channel.server_id ?? '');
  const roleColorMode = useUserSettingsValue().accessibility.role_colors;
  const focusComposer = useCallback(() => {
    const ta = document.querySelector<HTMLTextAreaElement>('textarea[data-editing]');
    ta?.focus();
  }, []);

  // Pinned messages
  const { data: pinnedMessages } = usePinnedMessages(channel.id);
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();

  // Reactions
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { data: reactionsData } = useMessageReactions(messageIds);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  // Polls
  const { data: polls = [] } = usePolls(channel.id);

  // Threads - fetch all threads for this channel to find message-linked threads
  const { data: threads = [] } = useThreads(channel.id);
  const updateThreadMut = useUpdateThread();
  const deleteThreadMut = useDeleteThread();

  // AI Summaries
  const {
    isSummariesEnabled,
    activeTopic,
    isDropdownOpen,
    toggleSummaries,
    toggleDropdown,
    selectTopic,
    markAsRead,
    summaries,
    isLoading: isSummariesLoading,
    generateSummaries,
    isGenerating,
    showLikedOnly,
    toggleLikedFilter,
    toggleLike,
    likedCount,
  } = useSummaries(channel?.id);

  // Auto mark-as-read for this channel (clears unread dot + mentions)
  const markChannelAsRead = useMarkChannelAsRead();
  useEffect(() => {
    if (!user || !channel?.id) return;
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const t = setTimeout(() => {
      markChannelAsRead(channel.id, channel.server_id || null);
    }, 400);
    return () => clearTimeout(t);
    // Re-run when channel changes or new messages arrive while focused
  }, [channel?.id, channel?.server_id, user, messages.length, markChannelAsRead]);

  // Get owner/admin status (already loaded from server context - instant)
  const { isGod, hasPermission: hasServerPermission } = usePermissions(channel.server_id || null);
  const isAdminOrOwner = isGod || hasServerPermission("administrator");
  const canManageRoles = isAdminOrOwner || hasServerPermission("manage_roles");
  const selectedUserMemberId = selectedUser
    ? members.find((member) => member.id === selectedUser.user.id)?.memberId
    : undefined;

  // Check multiple chat permissions reactively
  const { can: canPerm, isLoading: permissionsLoading } = useMultipleChannelPermissions(channel.id, [
    "send_messages",
    "attach_files",
    "add_reactions",
    "create_polls",
    "mention_everyone",
    "create_public_threads",
    "manage_messages",
    "manage_channels",
  ]);

  // Short-circuit for owners/admins - they always have permissions
  const canSendMessages = isAdminOrOwner || canPerm("send_messages");
  const canAttachFiles = isAdminOrOwner || canPerm("attach_files");
  const canAddReactions = isAdminOrOwner || canPerm("add_reactions");
  const canCreatePolls = isAdminOrOwner || canPerm("create_polls");
  const canMentionEveryone = isAdminOrOwner || canPerm("mention_everyone");
  const canCreateThreads = isAdminOrOwner || canPerm("create_public_threads");
  const canManageMessages = isAdminOrOwner || canPerm("manage_messages");
  const canManageChannels = isAdminOrOwner || canPerm("manage_channels");

  // State for channel settings modal
  const [channelSettingsId, setChannelSettingsId] = useState<string | null>(null);

  // Track channel transitions to prevent permission flash
  const prevChannelIdRef = useRef(channel.id);
  const isChannelTransitioning = prevChannelIdRef.current !== channel.id;

  useEffect(() => {
    prevChannelIdRef.current = channel.id;
  }, [channel.id]);

  // Permission denied: shown immediately based on cached/resolved verdict.
  // We no longer wait for `permissionsLoading` because that caused a 1s flash
  // of the writable input for users who actually don't have send_messages.
  // Tant que le verdict n'est pas connu (salon jamais ouvert : rien en cache), on garde la barre de saisie normale :
  // afficher "pas la permission" par defaut faisait clignoter une barre plus basse et sautiller tout le contenu du salon.
  const sendVerdictPending = permissionsLoading && !isAdminOrOwner;
  const permissionDeniedMessage =
    isAdminOrOwner || canSendMessages || sendVerdictPending
      ? undefined
      : "Vous n'avez pas la permission d'envoyer des messages dans ce salon.";

  // Scroll to message function for "Jump to Message"
  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("highlight-flash");
      setTimeout(() => element.classList.remove("highlight-flash"), 2000);
    }
  }, []);

  // Build all channels list for mention autocomplete
  const allChannels = useMemo(() => {
    const channels: Array<{ id: string; name: string; type: string }> = [];
    channelsData?.categories.forEach((cat) => {
      cat.channels.forEach((ch) => {
        channels.push({ id: ch.id, name: ch.name, type: ch.type || "text" });
      });
    });
    channelsData?.orphanChannels?.forEach((ch) => {
      channels.push({ id: ch.id, name: ch.name, type: ch.type || "text" });
    });
    return channels;
  }, [channelsData]);

  // Set up Markdown Context with real data
  useEffect(() => {
    // Build users map from messages authors
    const usersMap = new Map<string, { displayName: string; avatarUrl?: string; bio?: string }>();
    const userIds: string[] = [];

    messages.forEach((m) => {
      usersMap.set(m.author.id, {
        displayName: m.author.displayName,
        avatarUrl: m.author.avatar,
        bio: m.author.bio,
      });
      userIds.push(m.author.id);
    });
    // Add members data
    members.forEach((m) => {
      usersMap.set(m.id, {
        displayName: m.displayName,
        avatarUrl: m.avatar,
        bio: m.bio,
      });
      userIds.push(m.id);
    });

    // Register all user UUIDs in Snowflake registry for reverse lookups
    registerSnowflakeMappings(userIds);

    // Build roles map
    const rolesMap = new Map<string, { name: string; color: string }>();
    const roleIds: string[] = [];
    serverRoles.forEach((r) => {
      rolesMap.set(r.id, { name: r.name, color: r.color || "#99aab5" });
      roleIds.push(r.id);
    });

    // Build channels map
    const channelsMap = new Map<string, { name: string; serverId?: string }>();
    const channelIds: string[] = [];
    allChannels.forEach((ch) => {
      channelsMap.set(ch.id, { name: ch.name, serverId: channel.server_id });
      channelIds.push(ch.id);
    });

    // Register all IDs in Snowflake registry for reverse lookups
    registerSnowflakeMappings([...roleIds, ...channelIds]);

    setMarkdownContext({
      currentUserId: user?.id,
      serverId: channel.server_id,
      users: usersMap,
      roles: rolesMap,
      channels: channelsMap,
      onUserClick: (userId) => {
        const userData = usersMap.get(userId);
        if (userData) {
          const roles = memberRoles?.get(userId);
          setSelectedUser({
            user: {
              id: userId,
              username: userData.displayName.toLowerCase(),
              displayName: userData.displayName,
              avatar: userData.avatarUrl,
              bio: userData.bio,
              status: "online",
            },
            roles,
          });
        }
      },
      onChannelNavigate: (channelId, _targetServerId) => {
        if (onChannelSelect) {
          onChannelSelect(channelId);
        }
      },
      onMessageJump: (_serverId, channelId, messageId) => {
        if (channelId === channel.id) {
          scrollToMessage(messageId);
        } else if (onChannelSelect) {
          onChannelSelect(channelId);
        }
      },
    });
  }, [messages, members, serverRoles, allChannels, user?.id, channel, memberRoles, onChannelSelect, scrollToMessage]);

  // Pre-fetch images and link metadata as soon as messages arrive
  useEffect(() => {
    messages.forEach((msg) => {
      // Pre-fetch link metadata
      const urls = extractUrls(msg.content).filter((url) => !isInviteUrl(url));
      urls.forEach((url) => fetchMetadata(url));

      // Pre-load images from attachments
      const attachs = (msg as any).attachments as StoredAttachment[] | undefined;
      if (attachs) {
        attachs.forEach((att) => {
          if (att.type?.startsWith("image/") && att.url) {
            const img = new Image();
            img.src = att.url;
          }
        });
      }
    });
  }, [messages]);

  // Build a map of message_id -> thread for messages that have threads
  const threadsByMessageId = useMemo(() => {
    const map = new Map<string, Thread>();
    threads.forEach((thread) => {
      if (thread.message_id) {
        map.set(thread.message_id, thread);
      }
    });
    return map;
  }, [threads]);

  // Build a map of thread.id -> thread for system message lookups
  const threadsById = useMemo(() => {
    const map = new Map<string, Thread>();
    threads.forEach((thread) => {
      map.set(thread.id, thread);
    });
    return map;
  }, [threads]);
  const pinnedMessageIds = useMemo(() => new Set(pinnedMessages?.map((pm) => pm.message_id) || []), [pinnedMessages]);

  // Create unified timeline of messages and polls
  type TimelineItem =
    | {
        type: "message";
        data: Message;
        timestamp: Date;
      }
    | {
        type: "poll";
        data: Poll;
        timestamp: Date;
      };
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    messages.forEach((msg) =>
      items.push({
        type: "message",
        data: msg,
        timestamp: msg.timestamp,
      }),
    );
    polls.forEach((poll) =>
      items.push({
        type: "poll",
        data: poll,
        timestamp: new Date(poll.created_at),
      }),
    );
    return items.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }, [messages, polls]);
  const ephemeralMessages = useEphemeralMessages(channel.id);
  const [clydeCard, setClydeCard] = useState<DOMRect | null>(null);
  const handleCopyPollLink = (pollId: string) => {
    const link = `${window.location.origin}/channels/${channel.server_id}/${channel.id}/poll/${pollId}`;
    copyToClipboard(link, "Lien du sondage copié");
  };
  const handleDeletePoll = (poll: Poll) => {
    deletePoll.mutate({
      pollId: poll.id,
      channelId: channel.id,
    });
  };
  // Comme Discord : "Clore le sondage maintenant ?" avant de cloturer.
  const [pollToClose, setPollToClose] = useState<Poll | null>(null);
  const handleEndPoll = (poll: Poll) => setPollToClose(poll);
  const handleSubmit = () => {
    if (messageInput.trim() || attachments.length > 0) {
      // Trigger send animation
      setIsSending(true);
      setTimeout(() => setIsSending(false), 400);

      const replyTarget = replyingTo;
      const replyToId = replyTarget && messages.some((m) => m.id === replyTarget.id) ? replyTarget.id : null;
      onSendMessage(replyToId ? withReplyMention(messageInput, replyTarget?.author.id, user?.id) : messageInput, attachments, replyToId);

      setMessageInput("");
      setReplyingTo(null);
      clearAttachments();
      stopTyping();
    }
  };
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };
  const handleUserClick = (author: User) => {
    const roles = memberRoles?.get(author.id);
    setSelectedUser({
      user: author,
      roles,
    });
  };
  const handleCopyMessage = (content: string) => {
    copyToClipboard(content, "Message copié");
  };
  const handleCopyId = (id: string) => {
    copyToClipboard(uuidToSnowflake(id), "ID copié");
  };
  const handleAddReaction = (messageId: string, emoji: string) => {
    const currentReactions = reactionsData?.[messageId] || [];
    const hasReacted = currentReactions.some((r) => r.user_id === user?.id && r.emoji === emoji);
    if (hasReacted) {
      removeReaction.mutate({
        messageId,
        emoji,
      });
    } else {
      addReaction.mutate({
        messageId,
        emoji,
      });
    }
  };
  const handlePinMessage = (messageId: string) => {
    if (pinnedMessageIds.has(messageId)) {
      unpinMessage.mutate({
        messageId,
        channelId: channel.id,
      });
    } else {
      pinMessage.mutate({
        messageId,
        channelId: channel.id,
      });
    }
  };
  const handleStartEdit = (message: Message) => {
    lockScrollForEditTransition(message.id);
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    attachmentEdits.reset(((message as any).attachments ?? []) as never);
    requestAnimationFrame(() => {
      const el = editingTextareaRef.current;
      if (!el || hasFocusedEditTextareaRef.current) return;
      hasFocusedEditTextareaRef.current = true;
      resizeEditTextarea(el);
      el.focus({ preventScroll: true });
      restoreEditScrollLock();
    });
  };
  const handleSaveEdit = async () => {
    if (!editingMessageId || !user) return;
    // Fichiers deja prepares dans la zone de saisie : ils s'ajoutent au message modifie.
    const hasMedia = attachmentEdits.count > 0 || attachments.length > 0;
    if (!editingContent.trim() && !hasMedia) return;
    const messageId = editingMessageId;
    try {
      const finalAttachments = attachmentEdits.hasChanges || attachments.length > 0 ? await attachmentEdits.resolve(user.id, attachments) : undefined;
      lockScrollForEditTransition(messageId);
      editMessage.mutate({
        messageId,
        channelId: channel.id,
        content: editingContent,
        attachments: finalAttachments,
      });
      if (attachments.length > 0) clearAttachments();
      setEditingMessageId(null);
      setEditingContent("");
      attachmentEdits.reset();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la modification");
    }
  };
  const handleCancelEdit = () => {
    lockScrollForEditTransition(editingMessageId);
    setEditingMessageId(null);
    setEditingContent("");
    attachmentEdits.reset();
    if (attachments.length > 0) clearAttachments();
  };
  const handleDelete = (messageId: string) => {
    deleteMessage.mutate({
      messageId,
      channelId: channel.id,
    });
  };

  const handleContextDeleteSelect = (messageId: string) => {
    if (isShiftPressed) {
      handleDelete(messageId);
      return;
    }

    requestAnimationFrame(() => setPendingContextDeleteMessageId(messageId));
  };

  // "Y aller" depuis un fil : defile jusqu'au message demande une fois le salon reaffiche.
  useEffect(() => {
    const onJump = (e: Event) => {
      const { channelId, messageId } = (e as CustomEvent<{ channelId: string; messageId: string }>).detail;
      if (channelId !== channel.id) return;
      window.setTimeout(() => scrollToMessage(messageId), 350);
    };
    window.addEventListener(JUMP_TO_MESSAGE_EVENT, onJump);
    return () => window.removeEventListener(JUMP_TO_MESSAGE_EVENT, onJump);
  }, [channel.id, scrollToMessage]);
  const forwardedMap = useForwardedFrom("channel", channel.id, messages.map((m) => m.id));
  const markMessageUnread = useMarkMessageUnread();
  const forwardMessage = (message: Message) =>
    openForwardMessage({
      content: message.content,
      attachments: ((message as any).attachments ?? []) as StoredAttachment[],
      edited: !!message.edited_at,
      from: {
        kind: "channel",
        messageId: message.id,
        createdAt: (message as any).created_at ?? (message.timestamp ? new Date(message.timestamp).toISOString() : null),
        channelId: channel.id,
        channelName: channel.name,
        serverId: channel.server_id,
      },
    });
  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}/channels/${channel.server_id}/${channel.id}/${messageId}`;
    copyToClipboard(link, "Lien du message copié");
  };
  return (
    <div
      ref={(node) => {
        // Handle both refs
        chatContainerRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      className="flex-1 flex flex-col bg-background min-w-0 min-h-0 w-full overflow-x-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {serverAccess?.age_restricted && !isAdminOrOwner && channel.server_id && (
        <AgeGate serverId={channel.server_id} onLeave={() => navigate("/")} />
      )}
      {/* Upload Drop Overlay */}
      <AnimatePresence>{isDragging && <UploadDropOverlay channelName={channel.name} />}</AnimatePresence>
      {/* Channel Header - hidden on mobile where MobileChatView provides its own */}
      {!isMobile && (
        <div
          // En-tete de la capture : 48px, filet #3e3f45, pas d'ombre. Il se
          // prolonge visuellement par la rangee de recherche de MemberList.
          className="h-12 px-4 flex items-center gap-4 flex-shrink-0 bg-background w-full border-b border-border"
        >
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            {channel.icon_url ? (
              <img src={channel.icon_url} alt="" className="w-5 h-5 rounded-sm object-contain flex-shrink-0" />
            ) : serverAccess?.community_enabled && serverAccess.rules_channel_id === channel.id ? (
              <DiscordRules className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            ) : isAnnouncement ? (
              <StreamlineMegaphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            ) : (
              <StreamlineHash size={20} className="text-muted-foreground flex-shrink-0" />
            )}
            <h2 translate="no" className="text-base font-semibold text-white truncate">{channel.name}</h2>
            {isAnnouncement && (
              <button
                type="button"
                onClick={() => setFollowModalOpen(true)}
                className="ml-1 h-6 px-2 rounded-md bg-[hsl(var(--button-secondary))] hover:bg-[hsl(var(--interactive-background-selected))] text-xs font-semibold text-white shrink-0"
              >
                Suivre
              </button>
            )}
          </div>

          {channel.description && (
            <>
              <div className="w-px h-6 bg-border hidden sm:block" />
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors max-w-[150px] md:max-w-[250px] lg:max-w-[350px] min-w-0">
                    <MessageSquareText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-muted-foreground truncate [&_.markdown-content]:inline [&_h1]:text-sm [&_h2]:text-sm [&_h3]:text-sm [&_h4]:text-sm [&_p]:inline [&_*]:!m-0">
                      <MarkdownText
                        content={channel.description || ""}
                        className="[&_.markdown-content]:text-muted-foreground"
                      />
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-3">
                  <h4 className="font-semibold text-foreground mb-2">Sujet du salon</h4>
                  <MarkdownText
                    content={channel.description || ""}
                    className="text-sm text-muted-foreground [&_.markdown-content]:text-muted-foreground"
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          <div className="flex items-center gap-4 ml-auto">
            {/* Threads Popover */}
            <Popover open={threadsOpen} onOpenChange={setThreadsOpen}>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Fils" className={cn("p-0.5 text-[hsl(var(--header-icon))] hover:text-[hsl(var(--interactive-text-hover))] transition-colors", threadsOpen && "text-white")}>
                  <StreamlineThreads className="w-6 h-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={12} className="w-[min(674px,calc(100vw-1rem))] p-0 rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <ThreadsPopover channelId={channel.id} channelName={channel.name} onSelectThread={(threadId) => onSelectThread?.(threadId)} onDone={() => setThreadsOpen(false)} />
              </PopoverContent>
            </Popover>

            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Notifications" className={"p-0.5 text-[hsl(var(--header-icon))] hover:text-[hsl(var(--interactive-text-hover))] transition-colors"}>
                  <Bell className="w-6 h-6" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-64 p-3">
                <h4 className="font-semibold text-foreground mb-3">Notifications</h4>
                <div className="space-y-2">
                  <button type="button" className="flex items-center gap-2 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
                    <BellRing className="w-4 h-4 text-muted-foreground" />
                    <span>Tous les messages</span>
                  </button>
                  <button type="button" className="flex items-center gap-2 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
                    <AtSign className="w-4 h-4 text-muted-foreground" />
                    <span>Uniquement les mentions</span>
                  </button>
                  <button type="button" className="flex items-center gap-2 w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors">
                    <BellOff className="w-4 h-4 text-muted-foreground" />
                    <span>Aucun message</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Pinned Messages Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="Messages épinglés" className={cn("p-0.5 text-[hsl(var(--header-icon))] hover:text-[hsl(var(--interactive-text-hover))] transition-colors", "relative")}>
                  <Pin className="w-6 h-6" />
                  {pinnedMessages && pinnedMessages.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {pinnedMessages.length}
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" sideOffset={8} collisionPadding={12} className="w-[min(504px,calc(100vw-1rem))] p-0 overflow-hidden rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                <div className="flex items-center gap-3 px-5 h-[60px] border-b border-black/[0.2]">
                  <Pin className="w-6 h-6 text-[#b5bac1]" />
                  <h4 className="text-base font-semibold text-white">Messages épinglés</h4>
                </div>
                <ScrollArea className="max-h-80">
                  {pinnedMessages && pinnedMessages.length > 0 ? (
                    <div className="p-2 space-y-2">
                      {pinnedMessages.map((pm) => (
                        <div key={pm.id} className="p-3 bg-muted/50 rounded-lg group relative">
                          <div className="flex items-start gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={pm.message?.author?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary text-sm">
                                {pm.message?.author?.display_name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{pm.message?.author?.display_name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {pm.message?.created_at && formatDate(new Date(pm.message.created_at))}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{pm.message?.content}</p>
                            </div>
                          </div>
                          <button type="button"
                            onClick={() =>
                              unpinMessage.mutate({
                                messageId: pm.message_id,
                                channelId: channel.id,
                              })
                            }
                            className="absolute top-2 right-2 p-1 hover:bg-destructive/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3.5 h-3.5 text-destructive" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      <div className="flex flex-col items-center px-8 pt-10 pb-8">
                        <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden>
                          <circle cx="52" cy="62" r="40" fill="#2a2a31" stroke="#202026" strokeWidth="4" />
                          <circle cx="38" cy="54" r="4" fill="#202026" /><circle cx="66" cy="54" r="4" fill="#202026" />
                          <path d="M38 78c4-7 24-7 28 0" stroke="#202026" strokeWidth="4" strokeLinecap="round" />
                          <path d="M70 28l22-22m-26 6 28 28-8 8-6-3-10 10 3 6-8 8-24-24 8-8 6 3 10-10-3-6z" fill="#3b3b45" stroke="#202026" strokeWidth="3" strokeLinejoin="round" />
                        </svg>
                        <p className="mt-4 text-base leading-6 font-medium text-[#dbdee1] text-center max-w-[280px]">Ce salon n'a pas encore de message épinglé... pour l'instant.</p>
                      </div>
                      <div className="bg-[#32323a] px-6 py-5 text-center">
                        <p className="text-sm font-bold text-[#43b581]">Conseil de pro :</p>
                        <p className="mt-1 text-sm leading-[18px] text-[#dbdee1]">Les utilisateurs ayant la permission « Épingler les messages » peuvent épingler un message depuis son menu contextuel.</p>
                      </div>
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>

            {/* Members Toggle / Thread Close */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={() => {
                    if (activeThreadId) {
                      onCloseThread?.();
                    } else {
                      onToggleMembers?.();
                    }
                  }}
                  className={cn("h-auto w-auto p-0.5 hover:bg-transparent text-[hsl(var(--header-icon))] hover:text-[hsl(var(--interactive-text-hover))]", showMembers && !activeThreadId && "text-white")}
                >
                  <Users className="w-6 h-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {activeThreadId ? "Fermer le thread" : showMembers ? "Masquer la liste des membres" : "Afficher la liste des membres"}
              </TooltipContent>
            </Tooltip>

            {/* AI Summaries Trigger */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={toggleSummaries}
                  className={cn("h-auto w-auto p-0.5 hover:bg-transparent text-[hsl(var(--header-icon))] hover:text-[hsl(var(--interactive-text-hover))]", isSummariesEnabled && "text-white")}
                >
                  <StreamlineSummaries className="w-[22px] h-[22px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isSummariesEnabled ? "Masquer les résumés" : "Résumés IA"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* AI Summaries Bar */}
      {isSummariesEnabled && (
        <SummariesBar
          activeTopic={activeTopic}
          isDropdownOpen={isDropdownOpen}
          summaries={summaries}
          onToggleDropdown={toggleDropdown}
          onSelectTopic={selectTopic}
          onMarkAsRead={markAsRead}
          onGenerateSummaries={generateSummaries}
          isGenerating={isGenerating}
          isLoading={isSummariesLoading}
          showLikedOnly={showLikedOnly}
          onToggleLikedFilter={toggleLikedFilter}
          onToggleLike={toggleLike}
          likedCount={likedCount}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 w-full mb-6 [&>div[data-radix-scroll-area-viewport]]:!flex [&>div[data-radix-scroll-area-viewport]]:!flex-col [&>div[data-radix-scroll-area-viewport]>div]:!flex [&>div[data-radix-scroll-area-viewport]>div]:!flex-col [&>div[data-radix-scroll-area-viewport]>div]:!min-h-full [&>div[data-radix-scroll-area-viewport]>div]:!justify-end">
        <div className="msg-timeline flex flex-col min-h-full px-4 pt-4 pb-0 space-y-0.5 w-full max-w-full">
          {/* Spacer to push content to bottom */}
          <div className="flex-1" />

          {messagesLoading && messages.length === 0 ? (
            <MessageListSkeleton />
          ) : showChecklist && currentServer ? (
            <div className="mb-6">
              <ServerWelcomeChecklist
                serverName={currentServer.name}
                done={setup.done}
                onMarkLocal={setup.markLocal}
                onInvite={() => setChecklistInviteOpen(true)}
                onCustomizeIcon={() => onOpenServerSettings?.("profile")}
                onFirstMessage={focusComposer}
                onAddApp={() => onOpenServerSettings?.("integrations")}
                onBoosts={() => onOpenServerSettings?.("boost")}
              />
            </div>
          ) : (
          <>
          {/* Debut du salon, comme sur la capture : aligne a gauche, pastille
              ronde de 68px, titre 32px extra-gras, sous-titre 16px, puis un
              bouton secondaire (#3e3f45, 32px, rayon 8px). */}
          <div className="mb-4 animate-fade-in">
            <div className="w-[68px] h-[68px] rounded-full bg-[hsl(var(--button-secondary))] flex items-center justify-center mb-2">
              {isAnnouncement ? <StreamlineMegaphone className="w-10 h-10 text-white" /> : <StreamlineHash size="lg" className="text-white" />}
            </div>
            <h1 className="text-[32px] leading-10 font-extrabold text-white mb-1">
              Bienvenue dans #{channel.name} !
            </h1>
            <p className="text-base text-foreground">
              C'est le début du salon #{channel.name}.
            </p>
            {canManageChannels && (
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[hsl(var(--button-secondary))] border border-white/[0.03] text-base font-medium text-white hover:bg-[hsl(var(--interactive-background-selected))] transition-colors"
                onClick={() => setChannelSettingsId(channel.id)}
              >
                <Pencil className="w-4 h-4" />
                Modifier le salon
              </button>
            )}
          </div>
          </>
          )}

          {/* Timeline Items (Messages + Polls) with dynamic date separators */}
          {timelineItems.map((item, index) => {
            const currentDate = item.timestamp;
            const prevItem = index > 0 ? timelineItems[index - 1] : null;
            const showDateSeparator = !prevItem || currentDate.toDateString() !== prevItem.timestamp.toDateString();

            /* Séparateur de date (vidéo de référence) : filet discret de part et d'autre de la date. */
            const DateSeparator = showDateSeparator ? (
              <div className="flex items-center gap-2 my-4 mx-4"><div className="flex-1 h-px bg-white/[0.06]" /><span className="text-xs font-semibold text-[#949ba4] px-1">{formatDate(currentDate)}</span><div className="flex-1 h-px bg-white/[0.06]" /></div>
            ) : null;

            // Render Poll
            if (item.type === "poll") {
              const poll = item.data as Poll;
              const showAuthor =
                !prevItem ||
                prevItem.type !== "poll" ||
                (prevItem.data as Poll).author?.id !== poll.author?.id ||
                item.timestamp.getTime() - prevItem.timestamp.getTime() > 300000;
              const isOwnPoll = user?.id === poll.author_id;
              const isPollExpired = poll.expires_at ? new Date(poll.expires_at) <= new Date() : false;
              return (
                <div key={`poll-${poll.id}`} data-poll-id={poll.id}>
                  {DateSeparator}
                  <UniversalMessageContextMenu
                    messageId={poll.id}
                    isOwnMessage={isOwnPoll}
                    canAddReactions={canAddReactions}
                    canManageMessages={canManageMessages}
                    variant="poll"
                    copyLinkLabel="Copier le lien du sondage"
                    copyIdLabel="Copier l'ID du sondage"
                    onAddReaction={(emoji) => handleAddReaction(poll.id, emoji)}
                    onCopyLink={() => handleCopyPollLink(poll.id)}
                    onCopyId={() => handleCopyId(poll.id)}
                    onEdit={isOwnPoll ? () => setEditingPoll(poll) : undefined}
                    onDelete={isOwnPoll || canManageMessages ? () => handleDeletePoll(poll) : undefined}
                    extraItems={
                      isOwnPoll && !isPollExpired ? (
                        <ContextMenuItem onClick={() => handleEndPoll(poll)}>
                          <StopCircle className="w-4 h-4 mr-2" />
                          Clore le sondage maintenant
                        </ContextMenuItem>
                      ) : undefined
                    }
                  >
                    <PollLongPressWrapper
                        isMobile={isMobile}
                        onLongPress={() => setMobilePollSheetId(poll.id)}
                        className={cn(
                          "group message-hover px-4 -mx-4 mb-1 relative",
                          showAuthor ? "pt-[2px]" : "py-0",
                          messageMentionsMe(
                            poll.question,
                            user?.id,
                            memberRoles?.get(user?.id ?? "")?.map((r) => r.id) ?? [],
                          ) && "message-mentioned !-mx-4 !px-6",
                        )}
                        onMouseEnter={() => !isMobile && setHoveredPollId(poll.id)}
                        onMouseLeave={() => {
                          if (openDropdownPollId !== poll.id) setHoveredPollId(null);
                        }}
                      >
                        {!isMobile && (
                          <UniversalMessageActions
                            isVisible={hoveredPollId === poll.id || openDropdownPollId === poll.id}
                            isShiftPressed={isShiftPressed}
                            isOwnMessage={isOwnPoll}
                            canAddReactions={canAddReactions}
                            canManageMessages={canManageMessages}
                            onAddReaction={canAddReactions ? (emoji) => handleAddReaction(poll.id, emoji) : undefined}
                            onCopyLink={() => handleCopyPollLink(poll.id)}
                            onCopyId={() => handleCopyId(poll.id)}
                            onEdit={isOwnPoll ? () => setEditingPoll(poll) : undefined}
                            onDelete={isOwnPoll || canManageMessages ? () => handleDeletePoll(poll) : undefined}
                          />
                        )}
                        <MobilePollActions
                          open={mobilePollSheetId === poll.id}
                          onOpenChange={(open) => setMobilePollSheetId(open ? poll.id : null)}
                          isOwnPoll={isOwnPoll}
                          isPollExpired={isPollExpired}
                          onCopyLink={() => handleCopyPollLink(poll.id)}
                          onCopyId={() => handleCopyId(poll.id)}
                          onEdit={() => setEditingPoll(poll)}
                          onDelete={() => handleDeletePoll(poll)}
                          onEndPoll={() => handleEndPoll(poll)}
                          onAddReaction={(emoji) => handleAddReaction(poll.id, emoji)}
                        />
                        {showAuthor ? (
                          <div className="flex gap-4 my-0 pt-0 pb-[11px]">
                            <Avatar className="w-10 h-10 mt-0.5 flex-shrink-0">
                              <AvatarImage src={poll.author?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {poll.author?.display_name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 my-0 py-0">
                              <div className="flex items-baseline gap-2">
                                <span
                                  className="font-semibold text-base leading-[1.375rem]"
                                  style={{ color: roleColorMode === "names" ? memberRoles?.get(poll.author_id ?? "")?.[0]?.color || undefined : undefined }}
                                >
                                  {poll.author?.display_name || "Utilisateur inconnu"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(new Date(poll.created_at))}
                                </span>

                              </div>
                              <div className="mt-2">
                                <PollDisplay poll={poll} channelId={channel.id} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4 items-start">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="w-10 flex-shrink-0 text-xs text-muted-foreground/40 text-right pt-0.5 cursor-default">
                                  {formatTime(new Date(poll.created_at))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {new Date(poll.created_at).toLocaleString(appLocale(), {
                                  weekday: "long",
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}
                              </TooltipContent>
                            </Tooltip>
                            <div className="flex-1 min-w-0">
                              <PollDisplay poll={poll} channelId={channel.id} />
                            </div>
                          </div>
                        )}
                      </PollLongPressWrapper>
                  </UniversalMessageContextMenu>

                </div>
              );
            }

            // Render Message
            const message = item.data as Message;

            // Messages systeme de l'activation de la Communaute
            const followedMatch = message.is_system ? message.content.match(CHANNEL_FOLLOWED_RE) : null;
            if (followedMatch) {
              return (
                <div key={`msg-${message.id}`}>
                  {DateSeparator}
                  <ChannelFollowedSystemMessage
                    sourceChannelId={followedMatch[1]}
                    actorName={message.author.displayName}
                    onActorClick={() => handleUserClick(message.author)}
                    timeLabel={formatTime(message.timestamp)}
                  />
                </div>
              );
            }
            const pollClosedMatch = message.is_system ? message.content.match(POLL_CLOSED_RE) : null;
            if (pollClosedMatch) {
              const closedPoll = (polls ?? []).find((p) => p.id === pollClosedMatch[1]) ?? null;
              return (
                <div key={`msg-${message.id}`}>
                  {DateSeparator}
                  <PollClosedSystemMessage
                    poll={closedPoll}
                    timeLabel={formatTime(message.timestamp)}
                    mentionsMe={!!closedPoll && closedPoll.author_id === user?.id}
                    onAuthorClick={() => handleUserClick(message.author)}
                  />
                </div>
              );
            }
            const communityMatch = message.is_system ? message.content.match(COMMUNITY_SYSTEM_RE) : null;
            if (communityMatch) {
              return (
                <div key={`msg-${message.id}`}>
                  {DateSeparator}
                  <CommunitySystemMessage
                    kind={communityMatch[1] as "ALERTS" | "UPDATES"}
                    timestamp={message.timestamp}
                    timeLabel={formatTime(message.timestamp)}
                    actor={message.author}
                  />
                </div>
              );
            }

            // Render system message for thread creation
            if (message.is_system && message.content.startsWith("[SYSTEM:THREAD_CREATED:")) {
              const match = message.content.match(/\[SYSTEM:THREAD_CREATED:([^:]+):(.+)\]/);
              if (match) {
                const [, threadId, threadName] = match;
                const thread = threadsById.get(threadId);
                return (
                  <div key={`msg-${message.id}`}>
                    {DateSeparator}
                    <UniversalMessageContextMenu
                      messageId={message.id}
                      isOwnMessage={user?.id === message.author.id}
                      canAddReactions={canAddReactions}
                      canManageMessages={canManageMessages}
                      canManageReactions={canManageMessages}
                      hasReactions={(reactionsData?.[message.id]?.length ?? 0) > 0}
                      variant="system"
                      copyLinkLabel="Copier le lien du message"
                      copyIdLabel="Copier l'identifiant du message"
                      onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                      onCopyText={() => handleCopyMessage(message.content)}
                      onCopyLink={() => handleCopyMessageLink(message.id)}
                      onCopyId={() => handleCopyId(message.id)}
                      onDelete={() => handleContextDeleteSelect(message.id)}
                      onReport={user?.id !== message.author.id ? () => setReportingMessage(message) : undefined}
                      onViewReactions={() => setReactionsViewerMessageId(message.id)}
                      onClearAllReactions={() => clearMessageReactions.mutate({ messageId: message.id })}
                    >
                      <div
                        className="group message-hover relative -mx-4 px-8 pb-2 pt-1 mb-1"
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => {
                          if (openDropdownMessageId !== message.id) setHoveredMessageId(null);
                        }}
                      >
                        <UniversalMessageActions
                          isVisible={hoveredMessageId === message.id || openDropdownMessageId === message.id}
                          isShiftPressed={isShiftPressed}
                          isOwnMessage={user?.id === message.author.id}
                          onAddReaction={canAddReactions ? (emoji) => handleAddReaction(message.id, emoji) : undefined}
                          onCopyLink={() => handleCopyMessageLink(message.id)}
                          onCopyId={() => handleCopyId(message.id)}
                          onCopyText={() => handleCopyMessage(message.content)}
                          onMarkUnread={() => markMessageUnread({ kind: "channel", channelId: channel.id, createdAt: (message as any).created_at ?? new Date(message.timestamp).toISOString() })}
                          onDelete={user?.id === message.author.id || canManageMessages ? () => handleDelete(message.id) : undefined}
                          onDropdownOpenChange={(open) => {
                            setOpenDropdownMessageId(open ? message.id : null);
                            if (!open) setHoveredMessageId(null);
                          }}
                          canAddReactions={canAddReactions}
                          canManageMessages={canManageMessages}
                          customAction={thread ? <ViewThreadButton onClick={() => onSelectThread?.(threadId)} /> : undefined}
                        />
                        {/* System text line */}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <StreamlineThreads className="w-6 h-6 flex-shrink-0 text-[#b5bac1] -ml-[3px] mr-[9px]" />
                          <span className="text-base text-[#b5bac1]">
                            <span translate="no" className="font-semibold text-white">{message.author.displayName}</span> a commencé un fil :{" "}
                            <button translate="no" type="button"
                              onClick={() => onSelectThread?.(threadId)}
                              className="font-semibold text-white hover:underline cursor-pointer"
                            >
                              {threadName}
                            </button>
                            . <button type="button" onClick={() => setThreadsModalOpen(true)} className="hover:underline cursor-pointer">Voir tous les <span className="font-semibold text-white">fils</span></button>.
                          </span>
                          <span className="text-xs text-[#b5bac1] ml-1">{formatTime(message.timestamp)}</span>
                        </div>

                        {/* Spine + Thread embed : rien quand le fil a ete supprime (le message d'annonce reste, video de reference). */}
                        {thread && (
                          <div className="pt-1.5 pl-[40px] relative">
                            <div className="absolute left-[6px] top-0 w-[34px] h-1/2 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
                            <ThreadSystemMessage
                              thread={thread}
                              onClick={() => onSelectThread?.(threadId)}
                              canManage={thread.created_by === user?.id || canManageChannels}
                              channelName={channel.name}
                              serverId={channel.server_id}
                              onDelete={() => deleteThreadMut.mutate({ threadId: thread.id, channelId: channel.id })}
                            />
                          </div>
                        )}
                      </div>
                    </UniversalMessageContextMenu>

                  </div>
                );
              }
            }

            const hasReply = Boolean(message.replyToId || message.repliedMessage);
            const showAuthor =
              !prevItem ||
              prevItem.type !== "message" ||
              (prevItem.data as Message).author.id !== message.author.id ||
              item.timestamp.getTime() - prevItem.timestamp.getTime() > 300000 ||
              hasReply;
            const isOwnMessage = user?.id === message.author.id;
            const isEditing = editingMessageId === message.id;
            return (
              <div key={`msg-${message.id}`}>
                {DateSeparator}
                <UniversalMessageContextMenu
                  messageId={message.id}
                  reminder={buildReminder(message)}
                  isOwnMessage={isOwnMessage}
                  isPinned={pinnedMessageIds.has(message.id)}
                  canAddReactions={canAddReactions}
                  canManageMessages={canManageMessages}
                  canManageReactions={canManageMessages}
                  hasReactions={(reactionsData?.[message.id]?.length ?? 0) > 0}
                  previewAuthorName={message.author.displayName}
                  previewContent={message.content}
                  onReply={() => handleReply(message)}
                  onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                  onCopyText={() => handleCopyMessage(message.content)}
                  onCopyLink={() => handleCopyMessageLink(message.id)}
                  onCopyId={() => handleCopyId(message.id)}
                  onForward={message.is_system ? undefined : () => forwardMessage(message)}
                  onMarkUnread={() => markMessageUnread({ kind: "channel", channelId: channel.id, createdAt: (message as any).created_at ?? new Date(message.timestamp).toISOString() })}
                  onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                  onDelete={isOwnMessage || canManageMessages ? () => handleDelete(message.id) : undefined}
                  onPin={canManageMessages ? () => handlePinMessage(message.id) : undefined}
                  onCreateThread={canCreateThreads ? () => setCreateThreadForMessageId(message.id) : undefined}
                  onReport={!isOwnMessage ? () => setReportingMessage(message) : undefined}
                  onViewReactions={() => setReactionsViewerMessageId(message.id)}
                  onClearAllReactions={() => clearMessageReactions.mutate({ messageId: message.id })}
                  copyLinkLabel="Copier le lien du message"
                  copyIdLabel="Copier l'identifiant du message"
                >
                    <SwipeToReplyRow
                      enabled={isMobile || isTablet}
                      onReply={() => handleReply(message)}
                      onDoubleTap={canAddReactions ? () => handleAddReaction(message.id, "❤️") : undefined}
                    >
                      <div
                        ref={(el) => {
                          if (el) messageRefs.current.set(message.id, el);
                        }}
                        className={cn(
                          "group/message group message-hover -mx-4 px-8 mb-0 relative pt-[2px] pb-[4px]",
                          replyingTo?.id === message.id && "reply-target",
                          showAuthor && prevItem && "message-group-start",
                          messageMentionsMe(
                            message.content,
                            user?.id,
                            memberRoles?.get(user?.id ?? "")?.map((r) => r.id) ?? [],
                          ) && "message-mentioned",
                        )}
                        onMouseEnter={() => setHoveredMessageId(message.id)}
                        onMouseLeave={() => {
                          if (openDropdownMessageId !== message.id) setHoveredMessageId(null);
                        }}
                      >
                        <UniversalMessageActions
                          reminder={buildReminder(message)}
                          isVisible={
                            (hoveredMessageId === message.id || openDropdownMessageId === message.id) && !isEditing
                          }
                          isShiftPressed={isShiftPressed}
                          isOwnMessage={isOwnMessage}
                          onReply={() => handleReply(message)}
                          onAddReaction={canAddReactions ? (emoji) => handleAddReaction(message.id, emoji) : undefined}
                          onCopyLink={() => handleCopyMessageLink(message.id)}
                          onCopyId={() => handleCopyId(message.id)}
                          onCopyText={() => handleCopyMessage(message.content)}
                          onForward={message.is_system ? undefined : () => forwardMessage(message)}
                          onMarkUnread={() => markMessageUnread({ kind: "channel", channelId: channel.id, createdAt: (message as any).created_at ?? new Date(message.timestamp).toISOString() })}
                          onEdit={isOwnMessage ? () => handleStartEdit(message) : undefined}
                          onDelete={isOwnMessage || canManageMessages ? () => handleDelete(message.id) : undefined}
                          onCreateThread={canCreateThreads ? () => setCreateThreadForMessageId(message.id) : undefined}
                          onPin={canManageMessages ? () => handlePinMessage(message.id) : undefined}
                          isPinned={pinnedMessageIds.has(message.id)}
                          onDropdownOpenChange={(open) => {
                            setOpenDropdownMessageId(open ? message.id : null);
                            if (!open) setHoveredMessageId(null);
                          }}
                          canAddReactions={canAddReactions}
                          canManageMessages={canManageMessages}
                          customAction={
                            isAnnouncement && !message.published && !message.publishedAt && (isOwnMessage || canManageMessages)
                              ? <PublishActionButton onClick={() => setPublishConfirmId(message.id)} />
                              : undefined
                          }
                        />
                                                {showAuthor ? (
                          <div className="relative">
                            {threadsByMessageId.has(message.id) && <ThreadSpine startY={44} />}
                            {message.repliedMessage && !isEditing && (
                              <RepliedLine
                                repliedMessage={message.repliedMessage}
                                onJump={scrollToMessage}
                                indent={41}
                                avatarCenter={9}
                                authorColor={
                                  message.repliedMessage?.author
                                    ? memberRoles?.get(message.repliedMessage.author.id)?.[0]?.color || undefined
                                    : undefined
                                }
                                authorRole={
                                  message.repliedMessage?.author
                                    ? (memberRoles?.get(message.repliedMessage.author.id)?.[0] ?? null)
                                    : null
                                }
                                className="mb-1"
                              />
                            )}
                            <div className="flex gap-4 items-start -ml-[16px]">
                              {message.published ? (
                                <span className="mt-[2px]"><PublishedAvatar src={message.published} /></span>
                              ) : (
                              <button type="button" onClick={() => handleUserClick(message.author)} className="flex-shrink-0 !min-h-0 h-auto p-0">
                                <Avatar className="w-10 h-10 mt-[2px] hover:opacity-80 transition-opacity">
                                  <AvatarImage src={message.author.avatar} alt={message.author.displayName} />
                                  <AvatarFallback className="bg-primary/20 text-primary">
                                    {message.author.displayName.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </button>
                              )}
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                                  {message.published ? (
                                    <PublishedAuthorName src={message.published} />
                                  ) : (
                                  <button translate="no" type="button"
                                    onClick={() => handleUserClick(message.author)}
                                    className="font-semibold hover:underline cursor-pointer truncate max-w-[200px] flex-shrink-0 text-base leading-[1.375rem] !min-h-0 h-auto p-0"
                                    style={{ color: roleColorMode === "names" ? memberRoles?.get(message.author.id)?.[0]?.color || undefined : undefined }}
                                  >
                                    {message.author.displayName}
                                  </button>
                                  )}
                                  {!message.published && <ServerTagBadge userId={message.author.id} />}
                                  {!message.published && roleColorMode === "beside" && memberRoles?.get(message.author.id)?.[0]?.color && (
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: memberRoles.get(message.author.id)![0].color! }} aria-hidden="true" />
                                  )}
                                  {/* SYSTEM tag for system messages */}
                                  {(message as any).isSystemMessage && (
                                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5865f2] bg-[#5865f2]/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                                      SYSTEM
                                    </span>
                                  )}
                                  {/* Role badge icon - displayed to the right of username */}
                                  {(() => {
                                    // Comme Discord : icone du role le plus eleve QUI EN A une.
                                    const iconRole = message.published ? null : memberRoles?.get(message.author.id)?.find((r) => r.icon_url);
                                    return iconRole ? <RoleBadgePopover role={iconRole} /> : null;
                                  })()}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-xs text-muted-foreground flex-shrink-0 cursor-default">
                                        {formatTime(message.timestamp)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {new Date(message.timestamp).toLocaleString(appLocale(), {
                                        weekday: "long",
                                        day: "numeric",
                                        month: "long",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        second: "2-digit",
                                      })}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                <ForwardedFrame from={forwardedMap.get(message.id)} onJump={forwardedMap.get(message.id)?.kind === 'channel' && forwardedMap.get(message.id)?.channelId === channel.id ? (f) => scrollToMessage(f.messageId) : undefined}>
                                {false ? (
                                  <div className="mt-1 space-y-2">
                                    <MarkdownTextarea
                                      ref={setEditingTextareaNode}
                                      value={editingContent}
                                      onChange={(v) => {
                                        setEditingContent(v);
                                        if (editingTextareaRef.current) resizeEditTextarea(editingTextareaRef.current);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                                          e.preventDefault();
                                          handleSaveEdit();
                                        }
                                        if (e.key === "Escape") {
                                          handleCancelEdit();
                                        }
                                      }}
                                      className={editTextareaClass}
                                      rows={1}
                                    />
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>Échap pour annuler</span>
                                      <span>•</span>
                                      <span>Entrée pour sauvegarder • Maj+Entrée nouvelle ligne</span>
                                      <span
                                        className={cn(
                                          "ml-auto",
                                          editingContent.length > 1900 && "text-yellow-500",
                                          editingContent.length > 1980 && "text-destructive font-medium",
                                        )}
                                      >
                                        {editingContent.length}/2000
                                      </span>
                                      <div className="flex gap-1">
                                        <Button size="iconSm" variant="ghost" onClick={handleCancelEdit}>
                                          <X className="w-4 h-4" />
                                        </Button>
                                        <Button size="iconSm" variant="default" onClick={handleSaveEdit}>
                                          <Check className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="flex flex-wrap items-baseline gap-x-1 text-foreground break-words max-w-full font-ginto text-base leading-[1.375rem]"><MarkdownText variant="chat" content={message.content} />{message.edited_at && !forwardedMap.get(message.id) && <span className="text-[11px] leading-[1.375rem] text-muted-foreground/60 select-none">(modifié)</span>}{message.isQueued && <span className="text-[11px] text-muted-foreground select-none">(en attente du réseau)</span>}</div>
                                  </>
                                )}

                                {/* Message Attachments */}
                                {(message as any).attachments && (message as any).attachments.length > 0 && (
                                  <EditableAttachments
                                    attachments={(message as any).attachments as StoredAttachment[]}
                                    authorId={(message as any).author_id ?? (message as any).user_id ?? null}
                                    messageId={message.id}
                                    scope={{ kind: "channel", scopeId: channel.id }}
                                    editable={isOwnMessage && !message.is_system && !(message as any).isPending}
                                    hasText={!!message.content?.trim()}
                                  />
                                )}

                                {/* Link Embeds */}
                                <LinkEmbeds content={message.content} />
                                </ForwardedFrame>
                                {isAnnouncement && !message.is_system && !message.published && !message.publishedAt && !message.publishDismissed &&
                                  (isOwnMessage || canManageMessages) && announcementFollowers.length > 0 && (
                                  <PublishPrompt
                                    disabled={publishMessage.isPending}
                                    onPublish={() => setPublishConfirmId(message.id)}
                                    onDismiss={() => dismissPublish.mutate({ messageId: message.id, channelId: channel.id })}
                                  />
                                )}

                                {(reactionsData?.[message.id]?.length ?? 0) > 0 && (
                                  <div className="mt-1">
                                    <ReactionBar
                                      reactions={reactionsData?.[message.id] || []}
                                      onToggle={(emoji) => handleAddReaction(message.id, emoji)}
                                      serverId={channel.server_id}
                                      size="sm"
                                      onViewReactors={(emoji) => {
                                        setReactionsViewerInitialEmoji(emoji ?? null);
                                        setReactionsViewerMessageId(message.id);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Thread System Message */}
                            {threadsByMessageId.has(message.id) && (
                              <div className="pt-1.5 pl-[40px]">
                                <ThreadSystemMessage
                                  thread={threadsByMessageId.get(message.id)!}
                                  onClick={() => onSelectThread?.(threadsByMessageId.get(message.id)!.id)}
                                  canManage={threadsByMessageId.get(message.id)!.created_by === user?.id || canManageChannels}
                                  channelName={channel.name}
                              serverId={channel.server_id}
                                  onDelete={() => deleteThreadMut.mutate({ threadId: threadsByMessageId.get(message.id)!.id, channelId: channel.id })}
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="relative">
                            {threadsByMessageId.has(message.id) && <ThreadSpine startY={0} />}
                            {/* Note: hasReply forces showAuthor=true, so RepliedLine never renders here. */}
                            <div className="flex gap-4 items-start -ml-[16px]">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="w-10 flex-shrink-0 text-xs text-muted-foreground/40 text-right pt-0.5 cursor-default opacity-0 group-hover/message:opacity-100 transition-opacity">
                                    {formatTime(message.timestamp)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">
                                  {new Date(message.timestamp).toLocaleString(appLocale(), {
                                    weekday: "long",
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </TooltipContent>
                              </Tooltip>
                              <div className="flex-1 min-w-0">
                                <ForwardedFrame from={forwardedMap.get(message.id)} onJump={forwardedMap.get(message.id)?.kind === 'channel' && forwardedMap.get(message.id)?.channelId === channel.id ? (f) => scrollToMessage(f.messageId) : undefined}>
                                {false ? (
                                  <div className="space-y-2">
                                    <MarkdownTextarea
                                      ref={setEditingTextareaNode}
                                      value={editingContent}
                                      onChange={(v) => {
                                        setEditingContent(v);
                                        if (editingTextareaRef.current) resizeEditTextarea(editingTextareaRef.current);
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey && !isMobile) {
                                          e.preventDefault();
                                          handleSaveEdit();
                                        }
                                        if (e.key === "Escape") {
                                          handleCancelEdit();
                                        }
                                      }}
                                      className={editTextareaClass}
                                      rows={1}
                                    />
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <span>Échap pour annuler</span>
                                      <span>•</span>
                                      <span>Entrée pour sauvegarder • Maj+Entrée nouvelle ligne</span>
                                      <span
                                        className={cn(
                                          "ml-auto",
                                          editingContent.length > 1900 && "text-yellow-500",
                                          editingContent.length > 1980 && "text-destructive font-medium",
                                        )}
                                      >
                                        {editingContent.length}/2000
                                      </span>
                                      <div className="flex gap-1">
                                        <Button size="iconSm" variant="ghost" onClick={handleCancelEdit}>
                                          <X className="w-4 h-4" />
                                        </Button>
                                        <Button size="iconSm" variant="default" onClick={handleSaveEdit}>
                                          <Check className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                     <div className="flex flex-wrap items-baseline gap-x-1 text-foreground break-words max-w-full font-ginto text-base leading-[1.375rem]"><MarkdownText variant="chat" content={message.content} />{message.edited_at && !forwardedMap.get(message.id) && <span className="text-[11px] leading-[1.375rem] text-muted-foreground/60 select-none">(modifié)</span>}{message.isQueued && <span className="text-[11px] text-muted-foreground select-none">(en attente du réseau)</span>}</div>
                                  </>
                                )}

                                {/* Message Attachments for grouped messages */}
                                {(message as any).attachments && (message as any).attachments.length > 0 && (
                                  <EditableAttachments
                                    attachments={(message as any).attachments as StoredAttachment[]}
                                    authorId={(message as any).author_id ?? (message as any).user_id ?? null}
                                    messageId={message.id}
                                    scope={{ kind: "channel", scopeId: channel.id }}
                                    editable={isOwnMessage && !message.is_system && !(message as any).isPending}
                                    hasText={!!message.content?.trim()}
                                  />
                                )}

                                {/* Link Embeds */}
                                <LinkEmbeds content={message.content} />
                                </ForwardedFrame>
                                {isAnnouncement && !message.is_system && !message.published && !message.publishedAt && !message.publishDismissed &&
                                  (isOwnMessage || canManageMessages) && announcementFollowers.length > 0 && (
                                  <PublishPrompt
                                    disabled={publishMessage.isPending}
                                    onPublish={() => setPublishConfirmId(message.id)}
                                    onDismiss={() => dismissPublish.mutate({ messageId: message.id, channelId: channel.id })}
                                  />
                                )}

                                {(reactionsData?.[message.id]?.length ?? 0) > 0 && (
                                  <div className="mt-1">
                                    <ReactionBar
                                      reactions={reactionsData?.[message.id] || []}
                                      onToggle={(emoji) => handleAddReaction(message.id, emoji)}
                                      serverId={channel.server_id}
                                      size="sm"
                                      onViewReactors={(emoji) => {
                                        setReactionsViewerInitialEmoji(emoji ?? null);
                                        setReactionsViewerMessageId(message.id);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Thread System Message for grouped messages */}
                            {threadsByMessageId.has(message.id) && (
                              <div className="pt-1.5 pl-[40px]">
                                <ThreadSystemMessage
                                  thread={threadsByMessageId.get(message.id)!}
                                  onClick={() => onSelectThread?.(threadsByMessageId.get(message.id)!.id)}
                                  canManage={threadsByMessageId.get(message.id)!.created_by === user?.id || canManageChannels}
                                  channelName={channel.name}
                              serverId={channel.server_id}
                                  onDelete={() => deleteThreadMut.mutate({ threadId: threadsByMessageId.get(message.id)!.id, channelId: channel.id })}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </SwipeToReplyRow>
                </UniversalMessageContextMenu>
              </div>
            );
          })}
          {ephemeralMessages.map((m, i) => {
            const prev = i > 0 ? ephemeralMessages[i - 1].createdAt : timelineItems[timelineItems.length - 1]?.timestamp;
            return (
              <div key={m.id}>
                {(!prev || prev.toDateString() !== m.createdAt.toDateString()) && (
                  <div className="flex items-center gap-2 my-4 mx-4"><div className="flex-1 h-px bg-white/[0.06]" /><span className="text-xs font-semibold text-[#949ba4] px-1">{formatDate(m.createdAt)}</span><div className="flex-1 h-px bg-white/[0.06]" /></div>
                )}
                <EphemeralMessageRow message={m} time={formatTime(m.createdAt)} onAuthorClick={(rect) => setClydeCard(rect)} />
              </div>
            );
          })}
          <div ref={messagesEndRef} className="msg-end" />
        </div>
      </ScrollArea>

      {/*
       * Input container.
       *
       * This wrapper used to carry `px-4 pb-4 pt-2` while MessageInput also
       * applied its own gutter, so every composer in the app was inset 32px
       * instead of 16px and stood 76px tall (8+4+44+4+16) against a 52px user
       * panel — that 24px mismatch is exactly the vertical offset visible
       * next to the sidebar. The padding is removed here and MessageInput owns
       * it, which puts the row at 4+44+4 = 52px, matching the panel.
       *
       * The sibling children are unaffected: ReplyBanner (mx-4), TypingIndicator
       * (px-4) and the edit bar (mx-4) all carry their own 16px inset.
       */}
      <div className="flex-shrink-0 w-full relative">
        {showJumpToBottom && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--surface-elevated))] border border-border/60 shadow-[0_4px_16px_rgba(0,0,0,0.25)] text-xs animate-slide-in-bottom">
            <span className="text-muted-foreground">Vous consultez d'anciens messages</span>
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground font-medium hover:bg-primary/90"
            >
              Aller en bas
            </button>
          </div>
        )}
        <TypingIndicator channelId={channel.id} />
        {replyingTo && !editingMessageId && (
          <ReplyBanner
            authorName={replyingTo.author.displayName}
            authorId={replyingTo.author.id}
            onJump={() => scrollToMessage(replyingTo.id)}
            authorAvatar={replyingTo.author.avatar}
            authorColor={memberRoles?.get(replyingTo.author.id)?.[0]?.color || undefined}
            content={replyingTo.content}
            attachmentsCount={replyingTo.attachments?.length ?? 0}
            onClear={() => setReplyingTo(null)}
          />
        )}
        {editingMessageId && (
          <div className="mx-4 mb-2 flex items-center gap-2 bg-[hsl(var(--surface-3))] rounded-xl px-3 py-2 border-l-[3px] border-primary shadow-sm">
            <button type="button"
              onClick={handleCancelEdit}
              className="flex items-center justify-center w-6 h-6 rounded-full bg-[hsl(var(--surface-4))] hover:bg-[hsl(var(--surface-5))] text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              aria-label="Annuler la modification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm text-muted-foreground">Édition du message</span>
          </div>
        )}
        {editingMessageId && (
          <div className="mx-4 mb-2 rounded-xl bg-[hsl(var(--surface-3))] px-3 py-2.5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Médias du message</p>
            <AttachmentEditsPanel edits={attachmentEdits} />
          </div>
        )}
        <RulesGate
          enabled={!!serverAccess?.rules_enabled && (serverAccess?.rules.length ?? 0) > 0 && !isAdminOrOwner}
          serverId={channel.server_id}
          rules={serverAccess?.rules ?? []}
        >
        {isAnnouncement && richAnnouncementOpen && !editingMessageId ? (
          // Memes marges que MessageInput (px-2, 8px en bas) : le composeur
          // enrichi garde exactement la largeur du champ de saisie normal.
          <div className="animate-step-in flex-shrink-0 w-full min-w-0 px-2 pt-0 pb-2 max-md:pb-[calc(0.125rem+env(safe-area-inset-bottom,0px))]">
            <AnnouncementComposer
              channel={channel}
              serverName={currentServer?.name ?? ""}
              serverIcon={currentServer?.icon_url ?? undefined}
              canAttachFiles={canAttachFiles}
              canCreateThreads={canCreateThreads}
              canPublish={isAdminOrOwner || canManageMessages}
              canMentionEveryone={canMentionEveryone}
              onSent={() => setRichAnnouncementOpen(false)}
              onExit={() => setRichAnnouncementOpen(false)}
            />
          </div>
        ) : (
        <MessageInput
          value={editingMessageId ? editingContent : messageInput}
          onChange={editingMessageId ? setEditingContent : setMessageInput}
          onSend={editingMessageId ? () => handleSaveEdit() : handleSubmit}
          placeholder={
            editingMessageId
              ? "Modifier le message…"
              : `Envoyer un message dans #${channel.name}`
          }
          isSending={isSending}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          serverId={channel.server_id}
          channelId={channel.id}
          channelName={channel.name}
          editingMessageId={editingMessageId}
          members={members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            username: m.username,
            avatar: m.avatar,
          }))}
          roles={serverRoles.filter((r) => !r.is_default).map((r) => ({ id: r.id, name: r.name, color: r.color }))}
          channels={allChannels}
          attachments={attachments}
          onAddFiles={addFiles}
          onRemoveAttachment={removeAttachment}
          onUpdateAttachment={updateAttachment}
          onToggleSpoiler={toggleSpoiler}
          onClearAttachments={clearAttachments}
          permissionDeniedMessage={permissionDeniedMessage}
          canAttachFiles={canAttachFiles}
          extraPlusItems={
            isAnnouncement
              ? [{ key: "rich-announcement", label: "Annonce enrichie", icon: StreamlineMegaphone, onClick: () => setRichAnnouncementOpen(true) }]
              : undefined
          }
          canCreatePolls={canCreatePolls}
          canMentionEveryone={canMentionEveryone}
          slowmodeSeconds={channelDetails?.slowmode_seconds ?? 0}
          slash={
            channel.server_id && !editingMessageId
              ? {
                  sendText: (content) => onSendMessage(content, [], null),
                  sendExternal: (attachment) => onSendMessage('', [], null, attachment),
                }
              : undefined
          }
        />
        )}
        </RulesGate>
      </div>

      {clydeCard && <ClydeProfileCard anchor={clydeCard} onClose={() => setClydeCard(null)} />}

      <UserProfilePopup
        user={selectedUser?.user ?? null}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        roles={selectedUser?.roles}
        onOpenDM={onOpenDM}
        serverId={channel.server_id}
        memberId={selectedUserMemberId}
        canManageRoles={canManageRoles}
      />

      {/* Create Thread from Message Modal */}
      {isAnnouncement && (
        <>
          <FollowChannelModal
            open={followModalOpen}
            onClose={() => setFollowModalOpen(false)}
            sourceChannelId={channel.id}
            sourceChannelName={channel.name}
            sourceServerName={currentServer?.name ?? ""}
            sourceServerIcon={currentServer?.icon_url ?? undefined}
            onSuccess={() => {
              setFollowModalOpen(false);
              setFollowSuccessOpen(true);
            }}
          />
          <FollowSuccessModal open={followSuccessOpen} onClose={() => setFollowSuccessOpen(false)} />
          <PublishConfirmDialog
            open={!!publishConfirmId}
            onOpenChange={(o) => !o && setPublishConfirmId(null)}
            onConfirm={() => publishConfirmId && publishMessage.mutate({ messageId: publishConfirmId, channelId: channel.id })}
          />
        </>
      )}
      <ClosePollConfirmDialog
        open={!!pollToClose}
        onOpenChange={(o) => !o && setPollToClose(null)}
        onConfirm={() => {
          if (pollToClose) endPollMutation.mutate({ pollId: pollToClose.id, channelId: channel.id });
          setPollToClose(null);
        }}
      />

      <ThreadsModal open={threadsModalOpen} onOpenChange={setThreadsModalOpen} channelId={channel.id} channelName={channel.name} onSelectThread={(id) => onSelectThread?.(id)} />

      {/* Edit Poll Modal */}
      <CreatePollModal
        channelId={channel.id}
        serverId={channel.server_id}
        open={!!editingPoll}
        onOpenChange={(open) => !open && setEditingPoll(null)}
        editPoll={editingPoll}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={!!reportingMessage}
        onClose={() => setReportingMessage(null)}
        message={reportingMessage}
        onSubmit={(reason, details) => {
          console.log("Report submitted:", {
            reason,
            details,
            messageId: reportingMessage?.id,
          });
          setReportingMessage(null);
        }}
      />

      <DeleteMessageDialog
        open={!!pendingContextDeleteMessageId}
        onOpenChange={(open) => {
          if (!open) setPendingContextDeleteMessageId(null);
        }}
        onConfirm={() => {
          if (pendingContextDeleteMessageId) {
            handleDelete(pendingContextDeleteMessageId);
            setPendingContextDeleteMessageId(null);
          }
        }}
      />

      {checklistInviteOpen && channel.server_id && (
        <CreateInviteModal
          serverId={channel.server_id}
          channelName={channel.name}
          onClose={() => setChecklistInviteOpen(false)}
        />
      )}

      {/* Channel Settings Modal */}
      {channelSettingsId && (
        <ChannelSettingsModal
          channelId={channelSettingsId}
          serverId={channel.server_id}
          onClose={() => setChannelSettingsId(null)}
        />
      )}

      {/* Reactions Viewer Modal */}
      <ReactionsViewerModal
        messageId={reactionsViewerMessageId}
        canManageReactions={canManageMessages}
        initialEmoji={reactionsViewerInitialEmoji}
        onOpenChange={(open) => {
          if (!open) {
            setReactionsViewerMessageId(null);
            setReactionsViewerInitialEmoji(null);
          }
        }}
      />
    </div>
  );
});
