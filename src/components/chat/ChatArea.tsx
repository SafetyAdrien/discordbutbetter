import React, { useState, forwardRef, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Message, Channel, User } from "@/types/app";
import { cn } from "@/lib/utils";
import { uuidToSnowflake } from "@/lib/snowflake";
import {
  Hash,
  Bell,
  Pin,
  Users,
  Inbox,
  Copy,
  Reply,
  Pencil,
  Trash2,
  MessageSquareText,
  BellOff,
  BellRing,
  AtSign,
  X,
  Check,
  Link,
  SmilePlus,
  BarChart2,
  MoreHorizontal,
  Smile,
  Flag,
  StopCircle,
} from "lucide-react";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import StreamlineSummaries from "@/components/icons/StreamlineSummaries";
import { UniversalMessageActions } from "@/components/chat/UniversalMessageActions";
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
import { useMessageReactions, useAddReaction, useRemoveReaction, useClearMessageReactions, Reaction } from "@/hooks/useReactions";
import { ReactionsViewerModal } from "@/components/chat/ReactionsViewerModal";
import { Eye } from "lucide-react";
import { usePolls, useDeletePoll, useEndPoll, Poll } from "@/hooks/usePolls";
import { useThreads, useUpdateThread, useDeleteThread } from "@/hooks/useThreads";
import { useServerRoles } from "@/hooks/useRoles";
import { useChannels } from "@/hooks/useChannels";
import { Thread } from "@/types/thread";
import { PollDisplay } from "./PollDisplay";
import { CreatePollModal } from "./CreatePollModal";
import StreamlineThreads from "@/components/icons/StreamlineThreads";
import ThreadsPopover from "@/components/threads/ThreadsPopover";
import CreateThreadModal from "@/components/threads/CreateThreadModal";
import { ThreadSpine } from "@/components/threads/ThreadSpine";
import { ThreadSystemMessage } from "@/components/threads/ThreadSystemMessage";
import { MessageInput } from "@/components/chat/MessageInput";
import { ReportModal } from "@/components/chat/ReportModal";
import { RoleBadgePopover } from "@/components/chat/RoleBadgePopover";
import { DeleteMessageDialog } from "./DeleteMessageDialog";
import { toast } from "sonner";
import { useSummaries } from "@/hooks/useSummaries";
import { SummariesBar } from "@/components/summaries/SummariesBar";
import { UploadDropOverlay } from "@/components/chat/upload/UploadDropOverlay";
import { usePendingAttachments, PendingAttachment } from "@/hooks/usePendingAttachments";
import { MessageAttachments, StoredAttachment } from "@/components/chat/MessageAttachments";
import { useHasChannelPermission, useMultipleChannelPermissions } from "@/hooks/useUserChannelPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { ChannelSettingsModal } from "@/components/channel-settings/ChannelSettingsModal";
import { LinkEmbeds } from "@/components/chat/LinkEmbed";
import { useChannelDetails } from "@/hooks/useChannelSettings";
import { extractUrls, fetchMetadata } from "@/hooks/useUrlMetadata";
import { MobilePollActions } from "@/components/mobile/MobilePollActions";
import { ReactionBar } from "@/components/chat/ReactionBar";

// Reply Reference Component
function ReplyReference({ replyTo, onClear }: { replyTo: Message; onClear: () => void }) {
  return (
    <div className="mx-4 mb-2 flex items-center gap-2 bg-[hsl(var(--surface-3))] rounded-xl px-3 py-2 border-l-3 border-primary shadow-sm">
      <Reply className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs text-primary font-medium">Réponse à {replyTo.author.displayName}</span>
        <p className="text-sm text-muted-foreground truncate">{replyTo.content}</p>
      </div>
      <button onClick={onClear} className="p-1 hover:bg-muted rounded transition-colors">
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
    </div>
  );
}

// Quick reactions - exactement 3 émojis les plus populaires pour le hover standard
const QUICK_REACTIONS_HOVER = ["👍", "❤️", "😂"];

// Émojis favoris pour le menu contextuel
const CONTEXT_MENU_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

// QUICK_REACTIONS for PollActions

// Poll Actions Component (shown on hover) - Discord style
function PollActions({
  isVisible,
  onCopyLink,
  onEdit,
  onDelete,
  onReply,
  onAddReaction,
  isOwnPoll,
  isPollExpired,
  onEndPoll,
  onDropdownOpenChange,
}: {
  isVisible: boolean;
  onCopyLink: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReply: () => void;
  onAddReaction: (emoji: string) => void;
  isOwnPoll: boolean;
  isPollExpired?: boolean;
  onEndPoll?: () => void;
  onDropdownOpenChange?: (open: boolean) => void;
}) {
  if (!isVisible) return null;
  return (
    <div className="absolute top-0 right-0 -translate-y-1/2 flex items-center gap-0.5 bg-[hsl(var(--surface-3))] border border-border/50 rounded-2xl shadow-[var(--shadow-elevation-2)] p-1 z-10 animate-fade-in">
      {/* 1. Réactions rapides - 3 émojis */}
      {QUICK_REACTIONS_HOVER.map((emoji) => (
        <Tooltip key={emoji}>
          <TooltipTrigger asChild>
            <button
              onClick={() => onAddReaction(emoji)}
              className="p-1.5 hover:bg-primary/10 rounded-full transition-colors text-base"
            >
              {emoji}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{emoji}</TooltipContent>
        </Tooltip>
      ))}

      {/* 2. Picker emoji complet */}
      <Popover>
        <PopoverTrigger asChild>
          <button className="p-1.5 hover:bg-primary/10 rounded-full transition-colors">
            <SmilePlus className="w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="top" align="end" className="w-64 p-2">
          <div className="grid grid-cols-8 gap-1">
            {[
              "😀",
              "😃",
              "😄",
              "😁",
              "😆",
              "😅",
              "🤣",
              "😂",
              "🙂",
              "😊",
              "😇",
              "🥰",
              "😍",
              "🤩",
              "😘",
              "😗",
              "😚",
              "😙",
              "🥲",
              "😋",
              "😛",
              "😜",
              "🤪",
              "😝",
              "🤑",
              "🤗",
              "🤭",
              "🤫",
              "🤔",
              "🤐",
              "🤨",
              "😐",
            ].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddReaction(emoji)}
                className="p-1 hover:bg-muted rounded text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* 3. Répondre */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onReply} className="p-1.5 hover:bg-primary/10 rounded-full transition-colors">
            <Reply className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">Répondre</TooltipContent>
      </Tooltip>

      {/* 4. Menu Plus d'options */}
      <DropdownMenu onOpenChange={onDropdownOpenChange}>
        <DropdownMenuTrigger asChild>
          <button className="p-1.5 hover:bg-primary/10 rounded-full transition-colors">
            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onCopyLink}>
            <Link className="w-4 h-4 mr-2" />
            Copier le lien
          </DropdownMenuItem>
          {isOwnPoll && (
            <>
              <DropdownMenuSeparator />
              {!isPollExpired && onEndPoll && (
                <DropdownMenuItem onClick={onEndPoll}>
                  <StopCircle className="w-4 h-4 mr-2" />
                  Terminer le sondage
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
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
  onSendMessage: (content: string, attachments?: PendingAttachment[]) => void;
  memberRoles?: Map<string, Role[]>;
  onOpenDM?: (conversationId: string) => void;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  onSelectThread?: (threadId: string) => void;
  activeThreadId?: string | null;
  onCloseThread?: () => void;
  members?: Array<{ id: string; displayName: string; username: string; avatar?: string; bio?: string }>;
  onChannelSelect?: (channelId: string) => void;
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

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function formatDate(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return "Hier";
  }
  return date.toLocaleDateString("fr-FR", {
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
  },
  ref,
) {
  const isMobile = window.innerWidth < 768;
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages.length]);

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

  // Get owner/admin status (already loaded from server context - instant)
  const { isGod, hasPermission: hasServerPermission } = usePermissions(channel.server_id || null);
  const isAdminOrOwner = isGod || hasServerPermission("administrator");

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

  // Permission denied: show denied message only when permissions are resolved (not loading)
  // During loading or channel transition, show nothing (neutral state) to avoid flash
  const permissionDeniedMessage =
    isChannelTransitioning || permissionsLoading || isAdminOrOwner || canSendMessages
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
      const urls = extractUrls(msg.content);
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
  const handleEndPoll = (poll: Poll) => {
    endPollMutation.mutate({
      pollId: poll.id,
      channelId: channel.id,
    });
  };
  const handleSubmit = () => {
    if (messageInput.trim() || attachments.length > 0) {
      // Trigger send animation
      setIsSending(true);
      setTimeout(() => setIsSending(false), 400);

      // Include reply reference in message if replying
      const content = replyingTo
        ? `> **${replyingTo.author.displayName}:** ${replyingTo.content.substring(0, 100)}${replyingTo.content.length > 100 ? "..." : ""}\n\n${messageInput}`
        : messageInput;
      onSendMessage(content, attachments);
      setMessageInput("");
      setReplyingTo(null);
      clearAttachments();
      stopTyping();
    }
  };
  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };
  const handleReplyToPoll = (poll: Poll) => {
    // Créer un pseudo-message de réponse référençant le sondage
    setReplyingTo({
      id: poll.id,
      content: `📊 ${poll.question}`,
      author: {
        id: poll.author?.id || "",
        displayName: poll.author?.display_name || "Utilisateur inconnu",
        username: poll.author?.username || "unknown",
        avatar: poll.author?.avatar_url || undefined,
      },
      timestamp: new Date(poll.created_at),
      edited_at: null,
    } as Message);
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
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };
  const handleSaveEdit = () => {
    if (editingMessageId && editingContent.trim()) {
      editMessage.mutate({
        messageId: editingMessageId,
        channelId: channel.id,
        content: editingContent,
      });
      setEditingMessageId(null);
      setEditingContent("");
    }
  };
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingContent("");
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
      className="flex-1 flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 min-h-0 w-full overflow-x-hidden relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Upload Drop Overlay */}
      <AnimatePresence>{isDragging && <UploadDropOverlay channelName={channel.name} />}</AnimatePresence>
      {/* Channel Header - hidden on mobile where MobileChatView provides its own */}
      {!isMobile && (
        <div
          className="h-12 px-3 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full"
          style={{
            borderBottom: "1px solid hsl(var(--border) / 0.5)",
            boxShadow: "var(--shadow-elevation-1)",
            borderRadius: "0 0 var(--radius-xl) var(--radius-xl)",
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            <Hash className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
          </div>

          {channel.description && (
            <>
              <div className="w-px h-6 bg-border hidden sm:block" />
              <Popover>
                <PopoverTrigger asChild>
                  <button className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors max-w-[150px] md:max-w-[250px] lg:max-w-[350px] min-w-0">
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

          <div className="flex items-center gap-1 ml-auto">
            {/* Notifications Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="iconSm">
                  <Bell className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-64 p-3">
                <h4 className="font-semibold text-foreground mb-3">Notifications</h4>
                <div className="space-y-2">
                  <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                    <BellRing className="w-4 h-4 text-muted-foreground" />
                    <span>Tous les messages</span>
                  </button>
                  <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                    <AtSign className="w-4 h-4 text-muted-foreground" />
                    <span>Uniquement les mentions</span>
                  </button>
                  <button className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-sm">
                    <BellOff className="w-4 h-4 text-muted-foreground" />
                    <span>Aucun message</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Threads Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="iconSm">
                  <StreamlineThreads className="w-5 h-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-96 p-0">
                <ThreadsPopover channelId={channel.id} onSelectThread={(threadId) => onSelectThread?.(threadId)} />
              </PopoverContent>
            </Popover>

            {/* Pinned Messages Popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="iconSm" className="relative">
                  <Pin className="w-5 h-5" />
                  {pinnedMessages && pinnedMessages.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center">
                      {pinnedMessages.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-96 p-0">
                <div className="p-3 border-b border-border">
                  <h4 className="font-semibold text-foreground">Messages Épinglés</h4>
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
                          <button
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
                    <div className="text-sm text-muted-foreground/70 text-center py-8">
                      Ce salon n'a pas encore de message épinglé... pour l'instant.
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
                  className={cn(showMembers && !activeThreadId && "bg-surface-hover")}
                >
                  <Users className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {activeThreadId ? "Fermer le thread" : showMembers ? "Masquer les membres" : "Afficher les membres"}
              </TooltipContent>
            </Tooltip>

            {/* AI Summaries Trigger */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={toggleSummaries}
                  className={cn(isSummariesEnabled && "bg-surface-hover text-primary")}
                >
                  <StreamlineSummaries className="w-5 h-5" />
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
      <ScrollArea className="flex-1 min-h-0 w-full [&>div[data-radix-scroll-area-viewport]]:!flex [&>div[data-radix-scroll-area-viewport]]:!flex-col [&>div[data-radix-scroll-area-viewport]>div]:!flex [&>div[data-radix-scroll-area-viewport]>div]:!flex-col [&>div[data-radix-scroll-area-viewport]>div]:!min-h-full [&>div[data-radix-scroll-area-viewport]>div]:!justify-end">
        <div className="flex flex-col min-h-full px-4 py-4 pb-24 space-y-0.5 w-full max-w-full">
          {/* Spacer to push content to bottom */}
          <div className="flex-1" />

          {/* Welcome message - anchored at bottom like Discord */}
          <div className="mb-8 animate-fade-in">
            <div className="w-[72px] h-[72px] rounded-3xl bg-[hsl(var(--surface-3))] border border-border/30 flex items-center justify-center mb-4 shadow-[var(--shadow-elevation-1)]">
              <StreamlineHash size={42} className="text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-ginto font-bold mb-2">Bienvenue dans #{channel.name} !</h1>
            <p className="text-muted-foreground">C'est le début du salon #{channel.name}.</p>
            {canManageChannels && (
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setChannelSettingsId(channel.id)}>
                <Pencil className="w-3 h-3 mr-1.5" />
                Edit Channel
              </Button>
            )}
          </div>

          {/* Timeline Items (Messages + Polls) with dynamic date separators */}
          {timelineItems.map((item, index) => {
            const currentDate = item.timestamp;
            const prevItem = index > 0 ? timelineItems[index - 1] : null;
            const showDateSeparator = !prevItem || currentDate.toDateString() !== prevItem.timestamp.toDateString();

            const DateSeparator = showDateSeparator ? (
              <div className="flex items-center gap-4 my-3">
                <div className="flex-1 h-px bg-border/40" />
                <span className="text-[11px] text-muted-foreground font-semibold bg-[hsl(var(--surface-3))] border border-border/30 px-3 py-1 rounded-full shadow-sm">
                  {formatDate(currentDate)}
                </span>
                <div className="flex-1 h-px bg-border/40" />
              </div>
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
                <div key={`poll-${poll.id}`}>
                  {DateSeparator}
                  <ContextMenu>
                    <ContextMenuTrigger asChild>
                      <PollLongPressWrapper
                        isMobile={isMobile}
                        onLongPress={() => setMobilePollSheetId(poll.id)}
                        className={cn(
                          "group message-hover rounded-md px-2 -mx-2 mb-1 relative",
                          showAuthor ? "pt-1" : "py-0",
                        )}
                        onMouseEnter={() => !isMobile && setHoveredPollId(poll.id)}
                        onMouseLeave={() => {
                          if (openDropdownPollId !== poll.id) setHoveredPollId(null);
                        }}
                      >
                        {!isMobile && (
                          <PollActions
                            isVisible={hoveredPollId === poll.id || openDropdownPollId === poll.id}
                            onCopyLink={() => handleCopyPollLink(poll.id)}
                            onEdit={() => setEditingPoll(poll)}
                            onDelete={() => handleDeletePoll(poll)}
                            onReply={() => handleReplyToPoll(poll)}
                            onAddReaction={(emoji) => handleAddReaction(poll.id, emoji)}
                            isOwnPoll={isOwnPoll}
                            isPollExpired={isPollExpired}
                            onEndPoll={() => handleEndPoll(poll)}
                            onDropdownOpenChange={(open) => {
                              setOpenDropdownPollId(open ? poll.id : null);
                              if (!open) setHoveredPollId(null);
                            }}
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
                          <div className="flex gap-3 my-0 py-[5px]">
                            <Avatar className="w-10 h-10 mt-0.5 flex-shrink-0">
                              <AvatarImage src={poll.author?.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {poll.author?.display_name?.charAt(0).toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 my-0 py-0">
                              <div className="flex items-baseline gap-2">
                                <span className="font-semibold text-foreground">
                                  {poll.author?.display_name || "Utilisateur inconnu"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatTime(new Date(poll.created_at))}
                                </span>
                                <div className="flex items-center gap-1 text-[#5865f2] text-xs font-medium bg-[#5865f2]/10 px-1.5 py-0.5 rounded">
                                  <BarChart2 className="w-3 h-3" />
                                  POLL
                                </div>
                              </div>
                              <div className="mt-2">
                                <PollDisplay poll={poll} channelId={channel.id} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 items-start">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="w-10 flex-shrink-0 text-xs text-muted-foreground/40 text-right pt-0.5 cursor-default">
                                  {formatTime(new Date(poll.created_at))}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {new Date(poll.created_at).toLocaleString("fr-FR", {
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
                            <div className="flex-1">
                              <PollDisplay poll={poll} channelId={channel.id} />
                            </div>
                          </div>
                        )}
                      </PollLongPressWrapper>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-48">
                      <ContextMenuItem onClick={() => handleCopyPollLink(poll.id)}>
                        <Link className="w-4 h-4 mr-2" />
                        Copier le lien du sondage
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => handleCopyId(poll.id)}>
                        <Hash className="w-4 h-4 mr-2" />
                        Copier l'ID du sondage
                      </ContextMenuItem>
                      {isOwnPoll && (
                        <>
                          <ContextMenuSeparator />
                          {!isPollExpired && (
                            <ContextMenuItem onClick={() => handleEndPoll(poll)}>
                              <StopCircle className="w-4 h-4 mr-2" />
                              Terminer le sondage
                            </ContextMenuItem>
                          )}
                          <ContextMenuItem onClick={() => setEditingPoll(poll)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Modifier le sondage
                          </ContextMenuItem>
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => handleDeletePoll(poll)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer le sondage
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                </div>
              );
            }

            // Render Message
            const message = item.data as Message;

            // Render system message for thread creation
            if (message.is_system && message.content.startsWith("[SYSTEM:THREAD_CREATED:")) {
              const match = message.content.match(/\[SYSTEM:THREAD_CREATED:([^:]+):(.+)\]/);
              if (match) {
                const [, threadId, threadName] = match;
                const thread = threadsById.get(threadId);
                return (
                  <div key={`msg-${message.id}`}>
                    {DateSeparator}
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div className="group message-hover rounded-xl px-4 pb-2 pt-1 mb-1">
                          {/* System text line */}
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <StreamlineThreads className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              <span className="font-semibold text-foreground">{message.author.displayName}</span> a créé
                              un thread :{" "}
                              <button
                                onClick={() => onSelectThread?.(threadId)}
                                className="font-semibold text-primary hover:underline cursor-pointer"
                              >
                                {threadName}
                              </button>
                            </span>
                            <span className="text-muted-foreground/60 ml-1">{formatTime(message.timestamp)}</span>
                          </div>

                          {/* Spine + Thread embed */}
                          <div className="pt-1.5 pl-[50px] relative">
                            <div className="absolute left-[6px] top-0 w-[34px] h-1/2 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
                            {thread ? (
                              <ThreadSystemMessage
                                thread={thread}
                                onClick={() => onSelectThread?.(threadId)}
                                canManage={thread.created_by === user?.id || canManageChannels}
                                onRename={(name) => updateThreadMut.mutate({ threadId: thread.id, name })}
                                onDelete={() => {
                                  deleteThreadMut.mutate({ threadId: thread.id, channelId: channel.id });
                                  deleteMessage.mutate({ messageId: message.id, channelId: channel.id });
                                }}
                              />
                            ) : (
                              <button
                                onClick={() => onSelectThread?.(threadId)}
                                className="flex items-start gap-2 w-fit max-w-full text-left py-1.5 px-2 rounded transition-colors bg-surface-elevated"
                              >
                                <StreamlineThreads className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-primary hover:underline">
                                    {threadName}
                                  </span>
                                  <span className="text-xs text-foreground">0 Messages</span>
                                </div>
                              </button>
                            )}
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent
                        className="min-w-[220px] p-1.5 rounded-2xl shadow-[var(--shadow-elevation-3)] border border-border/50"
                        collisionPadding={8}
                      >
                        {/* Emoji reaction row */}
                        <div className="flex items-center gap-1 p-1.5 pb-2 border-b border-border/30 mb-1">
                          {CONTEXT_MENU_REACTIONS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleAddReaction(message.id, emoji)}
                              className="p-1.5 hover:bg-primary/10 rounded-full text-lg transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="p-1.5 hover:bg-primary/10 rounded-full transition-colors">
                                <SmilePlus className="w-5 h-5 text-muted-foreground" />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent side="right" align="start" className="w-64 p-2">
                              <div className="grid grid-cols-8 gap-1">
                                {[
                                  "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
                                  "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗",
                                  "😚", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝",
                                  "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐",
                                ].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleAddReaction(message.id, emoji)}
                                    className="p-1 hover:bg-muted rounded text-lg transition-colors"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Actions */}
                        <ContextMenuItem onClick={() => handleCopyMessage(message.content)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Copier le texte
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleCopyMessageLink(message.id)}>
                          <Link className="w-4 h-4 mr-2" />
                          Copier le lien du message
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => handleCopyId(message.id)}>
                          <Hash className="w-4 h-4 mr-2" />
                          Copier l'identifiant du message
                        </ContextMenuItem>

                        {(reactionsData?.[message.id]?.length ?? 0) > 0 && (
                          <>
                            <ContextMenuSeparator />
                            <ContextMenuItem onClick={() => setReactionsViewerMessageId(message.id)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir les réactions
                            </ContextMenuItem>
                            {canManageMessages && (
                              <ContextMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onClick={() => clearMessageReactions.mutate({ messageId: message.id })}
                              >
                                <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                                Supprimer toutes les réactions
                              </ContextMenuItem>
                            )}
                          </>
                        )}

                        {/* Danger zone */}
                        <ContextMenuSeparator />
                        {user?.id === message.author.id ? (
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onSelect={() => handleContextDeleteSelect(message.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                            Supprimer le message
                          </ContextMenuItem>
                        ) : (
                          <>
                            {canManageMessages && (
                              <ContextMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onSelect={() => handleContextDeleteSelect(message.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                                Supprimer le message
                              </ContextMenuItem>
                            )}
                            <ContextMenuItem
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              onClick={() => setReportingMessage(message)}
                            >
                              <Flag className="w-4 h-4 mr-2 text-destructive" />
                              Signaler ce message
                            </ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  </div>
                );
              }
            }

            const showAuthor =
              !prevItem ||
              prevItem.type !== "message" ||
              (prevItem.data as Message).author.id !== message.author.id ||
              item.timestamp.getTime() - prevItem.timestamp.getTime() > 300000;
            const isOwnMessage = user?.id === message.author.id;
            const isEditing = editingMessageId === message.id;
            return (
              <div key={`msg-${message.id}`}>
                {DateSeparator}
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div
                      ref={(el) => {
                        if (el) messageRefs.current.set(message.id, el);
                      }}
                      className={cn(
                        "group/message group message-hover rounded-xl px-4 pb-1 mb-1 relative",
                        showAuthor ? "pt-1.5" : "py-0.5",
                      )}
                      onMouseEnter={() => setHoveredMessageId(message.id)}
                      onMouseLeave={() => {
                        if (openDropdownMessageId !== message.id) setHoveredMessageId(null);
                      }}
                    >
                      <UniversalMessageActions
                        isVisible={
                          (hoveredMessageId === message.id || openDropdownMessageId === message.id) && !isEditing
                        }
                        isShiftPressed={isShiftPressed}
                        isOwnMessage={isOwnMessage}
                        onReply={() => handleReply(message)}
                        onAddReaction={canAddReactions ? (emoji) => handleAddReaction(message.id, emoji) : undefined}
                        onCopyLink={() => handleCopyMessageLink(message.id)}
                        onCopyId={() => handleCopyId(message.id)}
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
                      />
                      {showAuthor ? (
                        <div className="relative">
                          {threadsByMessageId.has(message.id) && <ThreadSpine startY={44} />}
                          <div className="flex gap-3 items-start">
                            <button onClick={() => handleUserClick(message.author)} className="flex-shrink-0">
                              <Avatar className="w-10 h-10 mt-0.5 hover:opacity-80 transition-opacity">
                                <AvatarImage src={message.author.avatar} alt={message.author.displayName} />
                                <AvatarFallback className="bg-primary/20 text-primary">
                                  {message.author.displayName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                                <button
                                  onClick={() => handleUserClick(message.author)}
                                  className="font-semibold text-foreground hover:underline cursor-pointer truncate max-w-[200px] flex-shrink-0"
                                >
                                  {message.author.displayName}
                                </button>
                                {/* SYSTEM tag for system messages */}
                                {(message as any).isSystemMessage && (
                                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[#5865f2] bg-[#5865f2]/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
                                    SYSTEM
                                  </span>
                                )}
                                {/* Role badge icon - displayed to the right of username */}
                                {memberRoles?.get(message.author.id)?.[0] &&
                                  memberRoles.get(message.author.id)![0].icon_url && (
                                    <RoleBadgePopover role={memberRoles.get(message.author.id)![0]} />
                                  )}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-xs text-muted-foreground flex-shrink-0 cursor-default">
                                      {formatTime(message.timestamp)}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {new Date(message.timestamp).toLocaleString("fr-FR", {
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
                              {isEditing ? (
                                <div className="mt-1 space-y-2">
                                  <Textarea
                                    ref={(el) => {
                                      if (el) {
                                        el.style.height = "auto";
                                        el.style.height = Math.min(el.scrollHeight, 200) + "px";
                                      }
                                    }}
                                    value={editingContent}
                                    onChange={(e) => {
                                      setEditingContent(e.target.value);
                                      e.target.style.height = "auto";
                                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit();
                                      }
                                      if (e.key === "Escape") {
                                        handleCancelEdit();
                                      }
                                    }}
                                    autoFocus
                                    className="bg-input min-h-[40px] max-h-[200px] resize-none"
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
                                <p className="text-foreground break-words max-w-full font-ginto overflow-hidden leading-[1.375rem]">
                                  <MarkdownText content={message.content} />
                                </p>
                              )}

                              {/* Message Attachments */}
                              {(message as any).attachments && (message as any).attachments.length > 0 && (
                                <MessageAttachments attachments={(message as any).attachments as StoredAttachment[]} />
                              )}

                              {/* Link Embeds */}
                              <LinkEmbeds content={message.content} />

                              {/* Edited indicator - after attachments */}
                              {message.edited_at && (
                                <span className="text-[.625rem] text-muted-foreground/40 mt-0.5 block">(modifié)</span>
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
                            <div className="pt-1.5 pl-[50px]">
                              <ThreadSystemMessage
                                thread={threadsByMessageId.get(message.id)!}
                                onClick={() => onSelectThread?.(threadsByMessageId.get(message.id)!.id)}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="relative">
                          {threadsByMessageId.has(message.id) && <ThreadSpine startY={0} />}
                          <div className="flex gap-3 items-start">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="w-10 flex-shrink-0 text-xs text-muted-foreground/40 text-right pt-0.5 cursor-default opacity-0 group-hover/message:opacity-100 transition-opacity">
                                  {formatTime(message.timestamp)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                {new Date(message.timestamp).toLocaleString("fr-FR", {
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
                              {isEditing ? (
                                <div className="space-y-2">
                                  <Textarea
                                    ref={(el) => {
                                      if (el) {
                                        el.style.height = "auto";
                                        el.style.height = Math.min(el.scrollHeight, 200) + "px";
                                      }
                                    }}
                                    value={editingContent}
                                    onChange={(e) => {
                                      setEditingContent(e.target.value);
                                      e.target.style.height = "auto";
                                      e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSaveEdit();
                                      }
                                      if (e.key === "Escape") {
                                        handleCancelEdit();
                                      }
                                    }}
                                    autoFocus
                                    className="bg-input min-h-[40px] max-h-[200px] resize-none"
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
                                <p className="text-foreground break-words max-w-full font-ginto overflow-hidden leading-[1.375rem]">
                                  <MarkdownText content={message.content} />
                                </p>
                              )}

                              {/* Message Attachments for grouped messages */}
                              {(message as any).attachments && (message as any).attachments.length > 0 && (
                                <MessageAttachments attachments={(message as any).attachments as StoredAttachment[]} />
                              )}

                              {/* Link Embeds */}
                              <LinkEmbeds content={message.content} />

                              {/* Edited indicator - after attachments */}
                              {message.edited_at && (
                                <span className="text-[.625rem] text-muted-foreground/40 mt-0.5 block">(modifié)</span>
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
                            <div className="pt-1.5 pl-[50px]">
                              <ThreadSystemMessage
                                thread={threadsByMessageId.get(message.id)!}
                                onClick={() => onSelectThread?.(threadsByMessageId.get(message.id)!.id)}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent
                    className="min-w-[220px] p-1.5 rounded-2xl shadow-[var(--shadow-elevation-3)] border border-border/50"
                    collisionPadding={8}
                  >
                    {/* Haut : Rangée d'émojis favoris */}
                    <div className="flex items-center gap-1 p-1.5 pb-2 border-b border-border/30 mb-1">
                      {CONTEXT_MENU_REACTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleAddReaction(message.id, emoji)}
                          className="p-1.5 hover:bg-primary/10 rounded-full text-lg transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="p-1.5 hover:bg-primary/10 rounded-full transition-colors">
                            <SmilePlus className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent side="right" align="start" className="w-64 p-2">
                          <div className="grid grid-cols-8 gap-1">
                            {[
                              "😀",
                              "😃",
                              "😄",
                              "😁",
                              "😆",
                              "😅",
                              "🤣",
                              "😂",
                              "🙂",
                              "😊",
                              "😇",
                              "🥰",
                              "😍",
                              "🤩",
                              "😘",
                              "😗",
                              "😚",
                              "😙",
                              "🥲",
                              "😋",
                              "😛",
                              "😜",
                              "🤪",
                              "😝",
                              "🤑",
                              "🤗",
                              "🤭",
                              "🤫",
                              "🤔",
                              "🤐",
                              "🤨",
                              "😐",
                            ].map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => handleAddReaction(message.id, emoji)}
                                className="p-1 hover:bg-muted rounded text-lg transition-colors"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Milieu : Actions principales */}
                    <ContextMenuItem onClick={() => handleReply(message)}>
                      <Reply className="w-4 h-4 mr-2" />
                      Répondre
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCopyMessage(message.content)}>
                      <Copy className="w-4 h-4 mr-2" />
                      Copier le texte
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handlePinMessage(message.id)}>
                      <Pin className="w-4 h-4 mr-2" />
                      {pinnedMessageIds.has(message.id) ? "Désépingler" : "Épingler"}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setCreateThreadForMessageId(message.id)}>
                      <StreamlineThreads className="w-4 h-4 mr-2" />
                      Créer un fil
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCopyMessageLink(message.id)}>
                      <Link className="w-4 h-4 mr-2" />
                      Copier le lien du message
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCopyId(message.id)}>
                      <Hash className="w-4 h-4 mr-2" />
                      Copier l'identifiant du message
                    </ContextMenuItem>

                    {(reactionsData?.[message.id]?.length ?? 0) > 0 && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => setReactionsViewerMessageId(message.id)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Voir les réactions
                        </ContextMenuItem>
                        {canManageMessages && (
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onClick={() => clearMessageReactions.mutate({ messageId: message.id })}
                          >
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                            Supprimer toutes les réactions
                          </ContextMenuItem>
                        )}
                      </>
                    )}

                    {/* Bas : Zone Danger */}
                    <ContextMenuSeparator />
                    {isOwnMessage ? (
                      <>
                        <ContextMenuItem onClick={() => handleStartEdit(message)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Modifier le message
                        </ContextMenuItem>
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onSelect={() => handleContextDeleteSelect(message.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                          Supprimer le message
                        </ContextMenuItem>
                      </>
                    ) : (
                      <>
                        {/* Moderators can delete other's messages */}
                        {canManageMessages && (
                          <ContextMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onSelect={() => handleContextDeleteSelect(message.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2 text-destructive" />
                            Supprimer le message
                          </ContextMenuItem>
                        )}
                        <ContextMenuItem
                          className="text-destructive focus:text-destructive focus:bg-destructive/10"
                          onClick={() => setReportingMessage(message)}
                        >
                          <Flag className="w-4 h-4 mr-2 text-destructive" />
                          Signaler ce message
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Fade-out overlay above composer */}
      <div className="absolute bottom-[88px] left-0 right-0 h-24 bg-gradient-to-b from-transparent to-background pointer-events-none z-[5]" />

      {/* Input Container - aligned with UserProfileCard (h-14) */}
      <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none w-full px-4 pb-4 pt-2 md:px-4 md:pb-4 md:pt-2">
        <div className="pointer-events-auto">
          <TypingIndicator channelId={channel.id} />
          {replyingTo && <ReplyReference replyTo={replyingTo} onClear={() => setReplyingTo(null)} />}
          <MessageInput
          value={messageInput}
          onChange={setMessageInput}
          onSend={handleSubmit}
          placeholder={`Envoyer un message dans #${channel.name}`}
          isSending={isSending}
          onTypingStart={startTyping}
          onTypingStop={stopTyping}
          serverId={channel.server_id}
          channelId={channel.id}
          channelName={channel.name}
          members={members.map((m) => ({
            id: m.id,
            displayName: m.displayName,
            username: m.username,
            avatar: m.avatar,
          }))}
          roles={serverRoles.map((r) => ({ id: r.id, name: r.name, color: r.color }))}
          channels={allChannels}
          attachments={attachments}
          onAddFiles={addFiles}
          onRemoveAttachment={removeAttachment}
          onUpdateAttachment={updateAttachment}
          onToggleSpoiler={toggleSpoiler}
          onClearAttachments={clearAttachments}
          permissionDeniedMessage={permissionDeniedMessage}
          canAttachFiles={canAttachFiles}
          canCreatePolls={canCreatePolls}
          canMentionEveryone={canMentionEveryone}
          slowmodeSeconds={channelDetails?.slowmode_seconds ?? 0}
          />
        </div>
      </div>

      <UserProfilePopup
        user={selectedUser?.user ?? null}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
        roles={selectedUser?.roles}
        onOpenDM={onOpenDM}
      />

      {/* Create Thread from Message Modal */}
      <CreateThreadModal
        open={!!createThreadForMessageId}
        onOpenChange={(open) => !open && setCreateThreadForMessageId(null)}
        channelId={channel.id}
        messageId={createThreadForMessageId || undefined}
        onThreadCreated={(threadId) => {
          setCreateThreadForMessageId(null);
          onSelectThread?.(threadId);
        }}
      />

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
          toast.success("Signalement envoyé. Merci !");
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
