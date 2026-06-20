import { useState, forwardRef, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Message, Channel, User } from "@/types/app";
import { cn } from "@/lib/utils";
import { uuidToSnowflake } from "@/lib/snowflake";
import { messageMentionsMe } from "@/lib/mention-detection";
import {
  Bell,
  Pin,
  Users,
  Inbox,
  Pencil,
  MessageSquareText,
  BellOff,
  BellRing,
  AtSign,
  X,
  Check,
  BarChart2,
} from "lucide-react";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";
import { UniversalMessageActions } from "@/components/chat/UniversalMessageActions";
import { UniversalMessageContextMenu } from "@/components/chat/UniversalMessageContextMenu";
import { ReplyBanner } from "@/components/chat/ReplyBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { UserProfilePopup } from "@/components/profile/UserProfilePopup";
import { copyToClipboard } from "@/lib/clipboard";
import { ThreadSpine } from "@/components/threads/ThreadSpine";
import { useAuth } from "@/contexts/AuthContext";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import { TypingIndicator } from "@/components/typing/TypingIndicator";
import { MarkdownText, setMarkdownContext, getMarkdownContext } from "@/lib/markdown";
import { registerSnowflakeMappings } from "@/lib/snowflake";
import { useMessages, useSendMessage, useEditMessage, useDeleteMessage } from "@/hooks/useMessages";
import { usePinnedMessages, usePinMessage, useUnpinMessage } from "@/hooks/usePinnedMessages";
import { useMessageReactions, useAddReaction, useRemoveReaction, Reaction } from "@/hooks/useReactions";
import { usePolls, useDeletePoll, Poll } from "@/hooks/usePolls";
import { useServerRoles } from "@/hooks/useRoles";
import { useChannels } from "@/hooks/useChannels";
import { useServers } from "@/hooks/useServers";
import { useMembers } from "@/hooks/useMembers";
import { MessageInput } from "@/components/chat/MessageInput";
import { AnnouncementComposer } from "./announcement/AnnouncementComposer";
import { RoleBadgePopover } from "@/components/chat/RoleBadgePopover";
import { FollowChannelModal } from "./announcement/FollowChannelModal";
import { FollowSuccessModal } from "./announcement/FollowSuccessModal";
import { PublishPrompt } from "./announcement/PublishPrompt";
import { PublishedMessageHeader } from "./announcement/PublishedMessageHeader";
import { useChannelFollowers, usePublishMessage, useDismissPublishPrompt } from "@/hooks/useChannelFollowers";
import { toast } from "sonner";
import StreamlineThreads from "@/components/icons/StreamlineThreads";
import ThreadsPopover from "@/components/threads/ThreadsPopover";
import CreateThreadModal from "@/components/threads/CreateThreadModal";
import { ThreadSystemMessage } from "@/components/threads/ThreadSystemMessage";
import { MessageAttachments, type StoredAttachment } from "@/components/chat/MessageAttachments";
import { Thread } from "@/types/thread";
import { useThreads, useUpdateThread, useDeleteThread } from "@/hooks/useThreads";
import { useMultipleChannelPermissions } from "@/hooks/useUserChannelPermissions";
import { usePermissions } from "@/hooks/usePermissions";
import { ChannelSettingsModal } from "@/components/channel-settings/ChannelSettingsModal";
import { RepliedLine } from "@/components/chat/RepliedLine";

interface Role {
  id: string;
  name: string;
  color: string | null;
  position: number | null;
  icon_url?: string | null;
  description?: string | null;
}

interface AnnouncementChannelProps {
  channel: Channel;
  onToggleMembers?: () => void;
  showMembers?: boolean;
  hideHeader?: boolean;
  onSelectThread?: (threadId: string) => void;
  activeThreadId?: string | null;
  onCloseThread?: () => void;
}

// Quick reactions
const QUICK_REACTIONS_HOVER = ["👍", "❤️", "😂"];

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

export function AnnouncementChannel({
  channel,
  onToggleMembers,
  showMembers = true,
  hideHeader = false,
  onSelectThread,
  activeThreadId,
  onCloseThread,
}: AnnouncementChannelProps) {
  const navigate = useNavigate();
  const [messageInput, setMessageInput] = useState("");
  const [selectedUser, setSelectedUser] = useState<{ user: User; roles?: Role[] } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [openDropdownMessageId, setOpenDropdownMessageId] = useState<string | null>(null);
  const [followModalOpen, setFollowModalOpen] = useState(false);
  const [followSuccessOpen, setFollowSuccessOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const { user } = useAuth();
  const { startTyping, stopTyping } = useTypingIndicator(channel.id, null);
  
  // Internal hooks for messages
  const { data: messagesData = [] } = useMessages(channel.id);
  const sendMessageMutation = useSendMessage();
  const editMessage = useEditMessage();
  const deleteMessage = useDeleteMessage();
  
  // Get server info
  const { data: servers = [] } = useServers();
  const currentServer = servers.find(s => s.id === channel.server_id);
  const serverName = currentServer?.name || "";
  const serverIcon = currentServer?.icon_url || undefined;

  // Fetch members for mentions
  const { data: membersData = [] } = useMembers(channel.server_id);
  const members = useMemo(() => 
    membersData.map(m => ({
      id: m.user.id,
      displayName: m.user.display_name,
      username: m.user.username,
      avatar: m.user.avatar_url || undefined,
    })), 
    [membersData]
  );
  
  // Build memberRoles map
  const memberRoles = useMemo(() => {
    const map = new Map<string, Role[]>();
    membersData.forEach(m => {
      map.set(m.user.id, m.roles as Role[]);
    });
    return map;
  }, [membersData]);

  // Transform messages to match Message type
  const messages: Message[] = useMemo(() => 
    messagesData.map(m => ({
      id: m.id,
      content: m.content,
      timestamp: new Date(m.created_at || Date.now()),
      edited_at: m.edited_at,
      attachments: ((m as any).attachments as StoredAttachment[]) || [],
      is_system: (m as any).is_system || false,
      author: m.author ? {
        id: m.author.id,
        username: m.author.username,
        displayName: m.author.display_name,
        avatar: m.author.avatar_url || undefined,
        status: m.author.status || 'offline',
        customStatus: m.author.custom_status || undefined,
      } : {
        id: 'unknown',
        username: 'unknown',
        displayName: 'Unknown',
        status: 'offline' as const,
      },
      // Extra fields for published messages (not in Message type, but we use them)
      isPublishedMessage: (m as any).is_published_message || false,
      sourceServerId: (m as any).source_server_id || undefined,
      sourceServerName: (m as any).source_server_name || undefined,
      sourceServerIcon: (m as any).source_server_icon || undefined,
      sourceChannelName: (m as any).source_channel_name || undefined,
      publishDismissed: (m as any).publish_dismissed || false,
      // Real reply fields (Discord-like)
      replyToId: (m as any).reply_to_id || null,
      repliedMessage: (m as any).repliedMessage
        ? {
            id: (m as any).repliedMessage.id,
            content: (m as any).repliedMessage.content,
            deleted: (m as any).repliedMessage.deleted,
            attachments: (m as any).repliedMessage.attachments || [],
            author: (m as any).repliedMessage.author
              ? {
                  id: (m as any).repliedMessage.author.id,
                  username: (m as any).repliedMessage.author.username,
                  displayName: (m as any).repliedMessage.author.display_name,
                  avatar: (m as any).repliedMessage.author.avatar_url || undefined,
                }
              : null,
          }
        : null,
    } as Message & { isPublishedMessage?: boolean; sourceServerId?: string; sourceServerName?: string; sourceServerIcon?: string; sourceChannelName?: string; publishDismissed?: boolean })),
    [messagesData]
  );

  // Fetch followers count
  const { data: followers = [] } = useChannelFollowers(channel.id);
  const publishMessage = usePublishMessage();
  const dismissPrompt = useDismissPublishPrompt();

  // Get owner/admin status (already loaded from server context - instant)
  const { isGod, hasPermission: hasServerPermission } = usePermissions(channel.server_id || null);
  const isAdminOrOwner = isGod || hasServerPermission('administrator');
  const canManageRoles = isAdminOrOwner || hasServerPermission('manage_roles');
  const selectedUserMemberId = selectedUser
    ? membersData.find((member) => member.user.id === selectedUser.user.id)?.id
    : undefined;

  // Check permissions — same as text channels + announcement extras
  const { can: canPerm, isLoading: permissionsLoading } = useMultipleChannelPermissions(channel.id, [
    'send_messages',
    'attach_files',
    'add_reactions',
    'create_polls',
    'mention_everyone',
    'create_public_threads',
    'manage_messages',
    'manage_channels',
    // Announcement-only extras
    'publish_messages',
    'follow_announcements',
  ]);

  // Short-circuit for owners/admins - they always have permissions
  const canSendMessages = isAdminOrOwner || canPerm('send_messages');
  const canAttachFiles = isAdminOrOwner || canPerm('attach_files');
  const canAddReactions = isAdminOrOwner || canPerm('add_reactions');
  const canCreatePolls = isAdminOrOwner || canPerm('create_polls');
  const canManageMessages = isAdminOrOwner || canPerm('manage_messages');
  const canManageChannels = isAdminOrOwner || canPerm('manage_channels');
  // Announcement extras
  const canPublishMessages = isAdminOrOwner || canPerm('publish_messages');
  const canFollowAnnouncements = isAdminOrOwner || canPerm('follow_announcements');
  
  // State for channel settings modal
  const [channelSettingsId, setChannelSettingsId] = useState<string | null>(null);
  const [createThreadForMessageId, setCreateThreadForMessageId] = useState<string | null>(null);
  
  // Threads
  const { data: threads = [] } = useThreads(channel.id);
  const updateThreadMut = useUpdateThread();
  const deleteThreadMut = useDeleteThread();
  
  // Build maps for thread rendering
  const threadsByMessageId = useMemo(() => {
    const map = new Map<string, Thread>();
    threads.forEach((thread) => {
      if (thread.message_id) map.set(thread.message_id, thread);
    });
    return map;
  }, [threads]);

  const threadsById = useMemo(() => {
    const map = new Map<string, Thread>();
    threads.forEach((thread) => map.set(thread.id, thread));
    return map;
  }, [threads]);
  
  // Channel transition tracking for anti-flash optimistic updates
  const prevChannelIdRef = useRef(channel.id);
  const isChannelTransitioning = prevChannelIdRef.current !== channel.id;

  useEffect(() => {
    prevChannelIdRef.current = channel.id;
  }, [channel.id]);

  // Permission denied: announcement-specific message with anti-flash logic
  const permissionDeniedMessage = (isChannelTransitioning || permissionsLoading || isAdminOrOwner || canSendMessages)
    ? undefined
    : "Suivez ce salon pour recevoir ses mises à jour sur votre propre serveur";

  // Fetch server roles and channels for markdown context
  const { data: serverRoles = [] } = useServerRoles(channel.server_id);
  const { data: channelsData } = useChannels(channel.server_id);

  // Pinned messages
  const { data: pinnedMessages } = usePinnedMessages(channel.id);
  const pinMessage = usePinMessage();
  const unpinMessage = useUnpinMessage();

  // Publish serverId + maps to the markdown context so RoleMention can
  // open RoleInfoPopup inside announcement channels (instant after refresh).
  useEffect(() => {
    if (!channel.server_id) return;
    const prev = getMarkdownContext();

    const usersMap = new Map<string, { displayName: string; avatarUrl?: string; bio?: string }>();
    const userIds: string[] = [];
    membersData.forEach((m) => {
      const displayName =
        m.serverProfile?.display_name || m.nickname || m.user.display_name || m.user.username;
      usersMap.set(m.user.id, {
        displayName,
        avatarUrl: m.serverProfile?.avatar_url || m.user.avatar_url || undefined,
        bio: m.serverProfile?.bio || m.user.bio || undefined,
      });
      userIds.push(m.user.id);
    });

    const rolesMap = new Map<string, { name: string; color: string }>();
    const roleIds: string[] = [];
    serverRoles.forEach((r) => {
      rolesMap.set(r.id, { name: r.name, color: r.color || '#99aab5' });
      roleIds.push(r.id);
    });

    const channelsMap = new Map<string, { name: string; serverId?: string }>();
    const channelIds: string[] = [];
    channelsData?.categories.forEach((cat) => {
      cat.channels.forEach((ch) => {
        channelsMap.set(ch.id, { name: ch.name, serverId: channel.server_id });
        channelIds.push(ch.id);
      });
    });
    channelsData?.orphanChannels?.forEach((ch) => {
      channelsMap.set(ch.id, { name: ch.name, serverId: channel.server_id });
      channelIds.push(ch.id);
    });

    registerSnowflakeMappings([...userIds, ...roleIds, ...channelIds]);

    setMarkdownContext({
      ...prev,
      currentUserId: user?.id,
      serverId: channel.server_id,
      users: usersMap,
      roles: rolesMap,
      channels: channelsMap,
    });

    return () => {
      setMarkdownContext(prev);
    };
  }, [channel.server_id, user?.id, membersData, serverRoles, channelsData]);

  // Reactions
  const messageIds = useMemo(() => messages.map((m) => m.id), [messages]);
  const { data: reactionsData } = useMessageReactions(messageIds);
  const addReaction = useAddReaction();
  const removeReaction = useRemoveReaction();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

  const pinnedMessageIds = useMemo(
    () => new Set(pinnedMessages?.map((pm) => pm.message_id) || []),
    [pinnedMessages]
  );

  const handleSubmit = () => {
    if (messageInput.trim()) {
      setIsSending(true);
      setTimeout(() => setIsSending(false), 400);
      sendMessageMutation.mutate({
        channelId: channel.id,
        content: messageInput,
        replyToId: replyingTo?.id ?? null,
      });
      setMessageInput("");
      setReplyingTo(null);
      stopTyping();
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const scrollToMessage = (messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('message-mentioned');
    setTimeout(() => el.classList.remove('message-mentioned'), 1500);
  };

  const handleUserClick = (author: User) => {
    const roles = memberRoles?.get(author.id);
    setSelectedUser({ user: author, roles });
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
      removeReaction.mutate({ messageId, emoji });
    } else {
      addReaction.mutate({ messageId, emoji });
    }
  };

  const handlePinMessage = (messageId: string) => {
    if (pinnedMessageIds.has(messageId)) {
      unpinMessage.mutate({ messageId, channelId: channel.id });
    } else {
      pinMessage.mutate({ messageId, channelId: channel.id });
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
    deleteMessage.mutate({ messageId, channelId: channel.id });
  };

  const handleCopyMessageLink = (messageId: string) => {
    const link = `${window.location.origin}/channels/${channel.server_id}/${channel.id}/${messageId}`;
    copyToClipboard(link, "Lien du message copié");
  };

  const handlePublishMessage = (message: Message) => {
    publishMessage.mutate({
      messageId: message.id,
      channelId: channel.id,
      content: message.content,
      sourceServerId: channel.server_id || "",
      sourceServerName: serverName,
      sourceServerIcon: serverIcon || null,
      sourceChannelName: channel.name,
    });
  };

  const handleDismissPublish = (messageId: string) => {
    dismissPrompt.mutate({ messageId, channelId: channel.id });
  };

  const handleFollowSuccess = () => {
    setFollowModalOpen(false);
    setFollowSuccessOpen(true);
  };

  return (
    <div className="flex-1 flex flex-col bg-[hsl(var(--surface-2)/0.3)] min-w-0 w-full overflow-x-hidden">
      {/* Channel Header */}
      {!hideHeader && <div className="h-12 px-2 sm:px-4 flex items-center gap-2 sm:gap-4 flex-shrink-0 bg-[hsl(var(--surface-2))] w-full" style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)", boxShadow: "var(--shadow-elevation-1)", borderRadius: "0 0 var(--radius-xl) var(--radius-xl)" }}>
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <StreamlineMegaphone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
           <h2 className="font-semibold text-foreground truncate">{channel.name}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFollowModalOpen(true)}
            className="text-sm font-medium flex-shrink-0 border border-border/60 bg-muted/40"
          >
            Suivre
          </Button>
        </div>

        {channel.description && (
          <>
            <div className="w-px h-6 bg-border hidden sm:block" />
            <Popover>
              <PopoverTrigger asChild>
                <button className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded hover:bg-muted/50 transition-colors max-w-[150px] md:max-w-[250px] lg:max-w-[350px] min-w-0">
                  <MessageSquareText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm text-muted-foreground truncate">{channel.description}</p>
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-3">
                <h4 className="font-semibold text-foreground mb-2">Sujet du salon</h4>
                <p className="text-sm text-muted-foreground">{channel.description}</p>
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
                              <span className="font-medium text-sm">
                                {pm.message?.author?.display_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {pm.message?.created_at && formatDate(new Date(pm.message.created_at))}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {pm.message?.content}
                            </p>
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

          {/* Inbox Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="iconSm">
                <Inbox className="w-5 h-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent side="bottom" align="end" className="w-[calc(100vw-2rem)] sm:w-72 md:w-80 max-w-80 p-3">
              <h4 className="font-semibold text-foreground mb-3">Boîte de Réception</h4>
              <div className="text-sm text-muted-foreground/70 text-center py-6">
                Aucune notification récente.
              </div>
            </PopoverContent>
          </Popover>


          {/* Members Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={onToggleMembers}
                className={cn(showMembers && "bg-surface-hover")}
              >
                <Users className="w-5 h-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{showMembers ? "Masquer les membres" : "Afficher les membres"}</TooltipContent>
          </Tooltip>
        </div>
      </div>}

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 w-full [&>div[data-radix-scroll-area-viewport]]:!flex [&>div[data-radix-scroll-area-viewport]]:!flex-col [&>div[data-radix-scroll-area-viewport]>div]:!flex [&>div[data-radix-scroll-area-viewport]>div]:!flex-col [&>div[data-radix-scroll-area-viewport]>div]:!min-h-full [&>div[data-radix-scroll-area-viewport]>div]:!justify-end">
        <div className="flex flex-col min-h-full px-4 py-4 space-y-0.5 w-full max-w-full">
          {/* Spacer to push content to bottom */}
          <div className="flex-1" />
          
          {/* Welcome message - anchored at bottom like Discord */}
          <div className="mb-8 animate-fade-in">
            <div className="w-[68px] h-[68px] rounded-full bg-muted flex items-center justify-center mb-4">
              <StreamlineMegaphone className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-3xl font-ginto font-bold mb-2">Bienvenue dans #{channel.name} !</h1>
            <p className="text-muted-foreground">
              C'est le début du salon #{channel.name}.
            </p>
            {canManageChannels && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => setChannelSettingsId(channel.id)}
              >
                <Pencil className="w-3 h-3 mr-1.5" />
                Edit Channel
              </Button>
            )}
          </div>

          {/* Messages with dynamic date separators */}
          {messages.map((message, index) => {
            const currentDate = message.timestamp;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showDateSeparator = !prevMessage || currentDate.toDateString() !== prevMessage.timestamp.toDateString();

            const DateSeparator = showDateSeparator ? (
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">
                  {formatDate(currentDate)}
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
            ) : null;

            // Handle system messages for thread creation
            if ((message as any).is_system && message.content.startsWith('[SYSTEM:THREAD_CREATED:')) {
              const match = message.content.match(/\[SYSTEM:THREAD_CREATED:([^:]+):(.+)\]/);
              if (match) {
                const [, threadId, threadName] = match;
                const thread = threadsById.get(threadId);
                return (
                  <div key={message.id}>
                    {DateSeparator}
                    <UniversalMessageContextMenu
                      messageId={message.id}
                      isOwnMessage={user?.id === message.author.id}
                      canAddReactions={false}
                      canManageMessages={canManageMessages}
                      variant="system"
                      onAddReaction={() => {}}
                      onCopyLink={() => handleCopyMessageLink(message.id)}
                      onCopyId={() => handleCopyId(message.id)}
                      onDelete={(user?.id === message.author.id || canManageMessages) ? () => handleDelete(message.id) : undefined}
                    >
                        <div className="py-1 px-4 my-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <StreamlineThreads className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>
                              <span className="font-semibold text-foreground">{message.author.displayName}</span>
                              {' '}a créé un thread :{' '}
                              <button
                                onClick={() => onSelectThread?.(threadId)}
                                className="font-semibold text-primary hover:underline cursor-pointer"
                              >
                                {threadName}
                              </button>
                            </span>
                            <span className="text-muted-foreground/60 ml-1">
                              {formatTime(message.timestamp)}
                            </span>
                          </div>
                          <div className="flex mt-1.5">
                            <div className="flex-shrink-0 w-8 relative mr-1.5">
                              <div className="absolute left-[6px] top-0 w-[20px] h-1/2 border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
                            </div>
                            <div className="flex-1 min-w-0">
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
                                  className="flex items-start gap-2 w-full text-left py-1.5 px-2 rounded transition-colors bg-surface-elevated"
                                >
                                  <StreamlineThreads className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-primary hover:underline">{threadName}</span>
                                    <span className="text-xs text-foreground">0 Messages</span>
                                  </div>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                    </UniversalMessageContextMenu>
                  </div>
                );
              }
            }
            
            const hasReply = Boolean((message as any).repliedMessage);
            const showAuthor =
              !prevMessage ||
              prevMessage.author.id !== message.author.id ||
              message.timestamp.getTime() - prevMessage.timestamp.getTime() > 300000 ||
              hasReply;
            const isOwnMessage = user?.id === message.author.id;
            const isEditing = editingMessageId === message.id;
            
            // Check if this is a published message from another server
            const isPublishedFromOther = (message as any).is_published_message && (message as any).source_server_id;
            
            // Show publish prompt for own messages that haven't been dismissed
            const showPublishPrompt =
              isOwnMessage &&
              canPublishMessages &&
              followers.length > 0 &&
              !(message as any).publish_dismissed &&
              !(message as any).is_published_message;

            return (
              <div key={message.id}>
                {DateSeparator}
                <UniversalMessageContextMenu
                  messageId={message.id}
                  isOwnMessage={isOwnMessage}
                  isPinned={pinnedMessageIds.has(message.id)}
                  canAddReactions={canAddReactions}
                  canManageMessages={canManageMessages}
                  hasReactions={(reactionsData?.[message.id]?.length ?? 0) > 0}
                  previewAuthorName={message.author.displayName}
                  previewContent={message.content}
                  onReply={() => handleReply(message)}
                  onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                  onCopyText={() => handleCopyMessage(message.content)}
                  onCopyLink={() => handleCopyMessageLink(message.id)}
                  onCopyId={() => handleCopyId(message.id)}
                  onEdit={(isOwnMessage || canManageMessages) ? () => handleStartEdit(message) : undefined}
                  onDelete={(isOwnMessage || canManageMessages) ? () => handleDelete(message.id) : undefined}
                  onPin={canManageMessages ? () => handlePinMessage(message.id) : undefined}
                  copyLinkLabel="Copier le lien du message"
                  copyIdLabel="Copier l'identifiant du message"
                >
                  <div
                    ref={(el) => {
                      if (el) messageRefs.current.set(message.id, el);
                    }}
                    className={cn(
                      "group message-hover -mx-4 pl-[21px] pr-8 relative",
                      showAuthor ? "pt-1" : "py-0",
                      messageMentionsMe(message.content, user?.id, memberRoles?.get(user?.id ?? '')?.map(r => r.id) ?? []) && "message-mentioned",
                    )}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => {
                      if (openDropdownMessageId !== message.id) setHoveredMessageId(null);
                    }}
                  >
                    {/* Message Actions - using UniversalMessageActions with Megaphone for announcement channels */}
                    <UniversalMessageActions
                      isVisible={
                        (hoveredMessageId === message.id || openDropdownMessageId === message.id) &&
                        !isEditing
                      }
                      isShiftPressed={isShiftPressed}
                      isOwnMessage={isOwnMessage}
                      isPinned={pinnedMessageIds.has(message.id)}
                      onReply={() => handleReply(message)}
                      onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                      onCopyLink={() => handleCopyMessageLink(message.id)}
                      onCopyId={() => handleCopyId(message.id)}
                      onCopyText={() => handleCopyMessage(message.content)}
                       onEdit={isOwnMessage || canManageMessages ? () => handleStartEdit(message) : undefined}
                       onDelete={isOwnMessage || canManageMessages ? () => handleDelete(message.id) : undefined}
                       onPin={canManageMessages ? () => handlePinMessage(message.id) : undefined}
                      onDropdownOpenChange={(open) => {
                        setOpenDropdownMessageId(open ? message.id : null);
                        if (!open) setHoveredMessageId(null);
                      }}
                      customAction={
                        canPublishMessages && isOwnMessage && followers.length > 0 ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() => handlePublishMessage(message)}
                                disabled={publishMessage.isPending}
                                className="p-1.5 hover:bg-muted rounded transition-colors text-primary"
                              >
                                <StreamlineMegaphone className="w-4 h-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Publier aux abonnés</TooltipContent>
                          </Tooltip>
                        ) : undefined
                      }
                    />

                    {showAuthor ? (
                      <div className="relative">
                        {threadsByMessageId.has(message.id) && <ThreadSpine startY={44} />}

                        {/* Real reply line (Discord-like) — preferred path */}
                        {(() => {
                          const repliedMsg = (message as any).repliedMessage;
                          if (repliedMsg && !isEditing) {
                            const topRole = repliedMsg.author
                              ? memberRoles?.get(repliedMsg.author.id)?.[0]
                              : undefined;
                            return (
                              <RepliedLine
                                repliedMessage={repliedMsg}
                                onJump={scrollToMessage}
                                indent={56}
                                avatarCenter={20}
                                authorColor={topRole?.color || undefined}
                                authorRole={topRole ?? null}
                                className="mb-1"
                              />
                            );
                          }
                          return null;
                        })()}

                        <div className="flex gap-3 items-start">
                        {isPublishedFromOther ? (
                          <Avatar className="w-10 h-10 mt-0.5 flex-shrink-0">
                            {(message as any).source_server_icon ? (
                              <AvatarImage
                                src={(message as any).source_server_icon}
                                alt={(message as any).source_server_name}
                              />
                            ) : null}
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {((message as any).source_server_name || "S").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <button onClick={() => handleUserClick(message.author)} className="flex-shrink-0">
                            <Avatar className="w-10 h-10 mt-0.5 hover:opacity-80 transition-opacity">
                              <AvatarImage src={message.author.avatar} alt={message.author.displayName} />
                              <AvatarFallback className="bg-primary/20 text-primary">
                                {message.author.displayName.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </button>
                        )}
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                            {isPublishedFromOther ? (
                              <>
                                <span className="font-semibold text-foreground">
                                  {(message as any).source_server_name} #{(message as any).source_channel_name}
                                </span>
                                <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">
                                  SERVEUR
                                </Badge>
                              </>
                            ) : (
                              <button
                                onClick={() => handleUserClick(message.author)}
                                className="font-semibold hover:underline cursor-pointer truncate max-w-[200px] flex-shrink-0"
                                style={{ color: memberRoles?.get(message.author.id)?.[0]?.color || undefined }}
                              >
                                {message.author.displayName}
                              </button>
                            )}
                            {!isPublishedFromOther && memberRoles?.get(message.author.id)?.[0]?.icon_url && (
                              <RoleBadgePopover role={memberRoles.get(message.author.id)![0]} />
                            )}
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              {formatTime(message.timestamp)}
                            </span>
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
                                <span>Entrée pour sauvegarder</span>
                                <div className="flex gap-1 ml-auto">
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
                              {(() => {
                                const allAttachments = ((message as any).attachments as StoredAttachment[]) || [];
                                const headerImage = allAttachments[0]?.type === 'image' ? allAttachments[0] : null;
                                const otherAttachments = headerImage ? allAttachments.slice(1) : allAttachments;
                                return (
                                  <>
                                    {headerImage && (
                                      <div className="mb-2">
                                        <MessageAttachments attachments={[headerImage]} />
                                      </div>
                                    )}
                                     <div className="text-foreground break-words font-ginto">
                                       <MarkdownText variant="chat" content={message.content} />
                                     </div>
                                    {otherAttachments.length > 0 && (
                                      <MessageAttachments attachments={otherAttachments} />
                                    )}
                                  </>
                                );
                              })()}
                              {message.edited_at && (
                                <span className="text-[.625rem] text-muted-foreground/40 mt-0.5 block">(modifié)</span>
                              )}
                              {showPublishPrompt && (
                                <div className="flex items-center gap-2 mt-2 bg-surface-hover rounded-md px-3 py-2 text-sm">
                                  <StreamlineMegaphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-muted-foreground">
                                    Partage ça avec tes abonnés !
                                  </span>
                                  <button
                                    onClick={() => handlePublishMessage(message)}
                                    disabled={publishMessage.isPending}
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {publishMessage.isPending ? "Publication..." : "Publier"}
                                  </button>
                                  <button
                                    onClick={() => handleDismissPublish(message.id)}
                                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                                    title="Ne plus afficher"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        </div>

                        {/* Thread System Message under message with thread */}
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
                      <div className="flex gap-3">
                        <span className="w-10 text-[11px] text-muted-foreground/0 group-hover:text-muted-foreground/70 transition-colors text-right flex-shrink-0 pt-0.5 select-none">
                          {formatTime(message.timestamp)}
                        </span>
                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingContent}
                                onChange={(e) => setEditingContent(e.target.value)}
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
                                <span>Entrée pour sauvegarder</span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {(() => {
                                const allAttachments = ((message as any).attachments as StoredAttachment[]) || [];
                                const headerImage = allAttachments[0]?.type === 'image' ? allAttachments[0] : null;
                                const otherAttachments = headerImage ? allAttachments.slice(1) : allAttachments;
                                return (
                                  <>
                                    {headerImage && (
                                      <div className="mb-2">
                                        <MessageAttachments attachments={[headerImage]} />
                                      </div>
                                    )}
                                     <div className="text-foreground break-words font-ginto">
                                       <MarkdownText variant="chat" content={message.content} />
                                       {message.edited_at && (
                                        <span className="text-[.625rem] text-muted-foreground/40 ml-1">(modifié)</span>
                                      )}
                                    </div>
                                    {otherAttachments.length > 0 && (
                                      <MessageAttachments attachments={otherAttachments} />
                                    )}
                                  </>
                                );
                              })()}
                              {showPublishPrompt && (
                                <div className="flex items-center gap-2 mt-2 bg-surface-hover rounded-md px-3 py-2 text-sm">
                                  <StreamlineMegaphone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-muted-foreground">
                                    Partage ça avec tes abonnés !
                                  </span>
                                  <button
                                    onClick={() => handlePublishMessage(message)}
                                    disabled={publishMessage.isPending}
                                    className="text-primary hover:underline font-medium"
                                  >
                                    {publishMessage.isPending ? "Publication..." : "Publier"}
                                  </button>
                                  <button
                                    onClick={() => handleDismissPublish(message.id)}
                                    className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </UniversalMessageContextMenu>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Container */}
      <div className="flex-shrink-0 w-full px-4 pb-4 pt-2">
        <TypingIndicator channelId={channel.id} />
        {replyingTo && (
          <ReplyBanner
            authorName={replyingTo.author.displayName}
            authorAvatar={replyingTo.author.avatar}
            content={replyingTo.content}
            attachmentsCount={replyingTo.attachments?.length ?? 0}
            onClear={() => setReplyingTo(null)}
          />
        )}
        <AnnouncementComposer
          channel={channel}
          serverName={serverName}
          serverIcon={serverIcon}
          permissionDeniedMessage={permissionDeniedMessage}
          canAttachFiles={canAttachFiles}
          canCreateThreads={isAdminOrOwner || canPerm('create_public_threads')}
          canPublish={canPublishMessages}
          canMentionEveryone={isAdminOrOwner || canPerm('mention_everyone')}
          showFollowBar={!canSendMessages && !permissionDeniedMessage}
          onFollowClick={() => setFollowModalOpen(true)}
        />
      </div>

      {/* User Profile Popup */}
      {selectedUser && (
        <UserProfilePopup
          user={selectedUser.user}
          roles={selectedUser.roles}
          open={!!selectedUser}
          onOpenChange={(open) => !open && setSelectedUser(null)}
          serverId={channel.server_id}
          ownerId={currentServer?.owner_id || undefined}
          secondaryOwnerId={currentServer?.secondary_owner_id || undefined}
          memberId={selectedUserMemberId}
          canManageRoles={canManageRoles}
        />
      )}

      {/* Follow Modal */}
      <FollowChannelModal
        open={followModalOpen}
        onClose={() => setFollowModalOpen(false)}
        sourceChannelId={channel.id}
        sourceChannelName={channel.name}
        sourceServerName={serverName}
        sourceServerIcon={serverIcon}
        onSuccess={handleFollowSuccess}
      />

      {/* Follow Success Modal */}
      <FollowSuccessModal open={followSuccessOpen} onClose={() => setFollowSuccessOpen(false)} />

      {/* Channel Settings Modal */}
      {channelSettingsId && (
        <ChannelSettingsModal
          channelId={channelSettingsId}
          serverId={channel.server_id}
          onClose={() => setChannelSettingsId(null)}
        />
      )}

      {/* Create Thread Modal */}
      {createThreadForMessageId && (
        <CreateThreadModal
          channelId={channel.id}
          messageId={createThreadForMessageId}
          open={!!createThreadForMessageId}
          onOpenChange={(open) => !open && setCreateThreadForMessageId(null)}
          forcePublic
          onThreadCreated={(threadId) => {
            setCreateThreadForMessageId(null);
            onSelectThread?.(threadId);
          }}
        />
      )}
    </div>
  );
}
