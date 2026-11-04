import { cn } from '@/lib/utils';
import { NEW_THREAD_ID, OPEN_NEW_THREAD_EVENT } from '@/lib/threadEvents';
import { NewThreadPanel } from '@/components/threads/NewThreadPanel';
import { FavoritesSidebar, favKey } from '@/components/favorites/FavoritesSidebar';
import { FavoritesEmpty } from '@/components/favorites/FavoritesEmpty';
import { useFavorites } from '@/hooks/useFavorites';
import type { FavoriteItem } from '@/lib/userSettings';
import { OPEN_USER_SETTINGS_EVENT } from '@/lib/settingsEvents';
import { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { OPEN_SERVER_EVENT, OPEN_FRIENDS_EVENT } from '@/lib/invites';
import { LazyServerViewPage as ServerViewPage } from '@/components/lazy/LazyModals';
import type { ServerView } from '@/components/server-views/ServerViews';
import { MemberOnboardingGate } from '@/components/onboarding/MemberOnboarding';
import { ServerList } from '@/components/layout/ServerList';
import { ChannelList } from '@/components/layout/ChannelList';
import { UserProfileCard } from '@/components/profile/UserProfileCard';
import { DMCallStatusBadge } from '@/components/layout/DMCallStatusBadge';
import { IncomingCallWatcher } from '@/components/dm/IncomingCallWatcher';
import { useDMCallSession } from '@/lib/dmCallSession';
import { VoiceStatusBadge } from '@/components/layout/VoiceStatusBadge';
import { MemberList } from '@/components/layout/MemberList';
import { ChatArea } from '@/components/chat/ChatArea';
import { DMPage, DMSidebar, type DMView } from '@/components/dm/DMPage';
// The mobile tree is ~12k LOC (and carries most of the framer-motion usage).
// It is statically imported at the top of this file, which meant every desktop
// visitor downloaded the entire mobile UI — and its animation runtime — on first
// load. Lazy-loading it keeps it out of the desktop bundle entirely.
const MobileLayout = lazy(() => import('@/components/mobile/MobileLayout').then((m) => ({ default: m.MobileLayout })));
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useServers, usePublicServers, useCreateServer, useJoinServer } from '@/hooks/useServers';
import { useChannels } from '@/hooks/useChannels';
import { useMessages, useSendMessage } from '@/hooks/useMessages';
import { useMembers, MemberWithProfile } from '@/hooks/useMembers';
import { useProfilesRealtime } from '@/hooks/useProfilesRealtime';
import { useDownloadPermissionsRecipientRealtime } from '@/hooks/useDownloadPermissions';
import { usePermissionsRealtime, useGlobalPermissionsRealtime } from '@/hooks/usePermissionsRealtime';
import { useServerAssetsRealtime } from '@/hooks/useServerAssets';
import { usePrefetchThreadsForChannels } from '@/hooks/useThreads';
import { prefetchUrls, extractUrls } from '@/hooks/useUrlMetadata';

import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useVoice, useVoiceLevels } from '@/contexts/VoiceContext';
import { useNavigationState } from '@/hooks/useNavigationState';
import { useHistoryNavigation, HistoryViewState } from '@/hooks/useHistoryNavigation';
import LoadingScreen from '@/components/LoadingScreen';
import { usePreloader } from '@/hooks/usePreloader';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Users } from '@/components/icons/discord/lucide';
import type { Server, Message, User } from '@/types/app';
import { setDesktopTitle } from '@/lib/desktop';

// Lazily loaded: only rendered on explicit user action (open modal / switch to
// this channel type), so they shouldn't bloat the initial bundle.
const AccountSettingsModal = lazy(() =>
  import('@/components/account-settings/AccountSettingsModal').then((m) => ({ default: m.AccountSettingsModal }))
);
const DiscoveryPage = lazy(() =>
  import('@/components/discovery/DiscoveryPage').then((m) => ({ default: m.DiscoveryPage }))
);
const CreateServerModal = lazy(() =>
  import('@/components/modals/CreateServerModal').then((m) => ({ default: m.CreateServerModal }))
);
const ServerSettingsModal = lazy(() =>
  import('@/components/server-settings/ServerSettingsModal').then((m) => ({ default: m.ServerSettingsModal }))
);
const KeyboardShortcutsModal = lazy(() =>
  import('@/components/modals/KeyboardShortcutsModal').then((m) => ({ default: m.KeyboardShortcutsModal }))
);
const MessageSearchPanel = lazy(() =>
  import('@/components/layout/MessageSearchPanel').then((m) => ({ default: m.MessageSearchPanel }))
);
const MediaChannel = lazy(() =>
  import('@/components/channels/MediaChannel').then((m) => ({ default: m.MediaChannel }))
);
const ForumChannel = lazy(() =>
  import('@/components/channels/ForumChannel').then((m) => ({ default: m.ForumChannel }))
);
const TasksChannel = lazy(() =>
  import('@/components/channels/TasksChannel').then((m) => ({ default: m.TasksChannel }))
);
const CalendarChannel = lazy(() =>
  import('@/components/channels/CalendarChannel').then((m) => ({ default: m.CalendarChannel }))
);
const VoiceChannelView = lazy(() =>
  import('@/components/channels/VoiceChannelView').then((m) => ({ default: m.VoiceChannelView }))
);
const StageChannel = lazy(() =>
  import('@/components/channels/StageChannel').then((m) => ({ default: m.StageChannel }))
);
const ThreadView = lazy(() => import('@/components/threads/ThreadView'));

// Main application component
const Index = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  
  // Navigation state persistence
  const {
    activeServerId: persistedServerId,
    activeDMId: persistedDMId,
    activeChannelId: persistedChannelId,
    activeThreadId: persistedThreadId,
    threadChannelId: persistedThreadChannelId,
    channelsByServer,
    setActiveServerId: setPersistedServerId,
    setActiveDMId: setPersistedDMId,
    setActiveChannelId: setPersistedChannelId,
    setActiveThreadId: setPersistedThreadId,
    setThreadChannelId: setPersistedThreadChannelId,
    setChannelForServer,
    getChannelForServer,
    threadFullscreen,
    setThreadFullscreen,
  } = useNavigationState();
  
  const [activeServerId, setActiveServerIdLocal] = useState<string | null>(persistedServerId);
  const [activeChannelId, setActiveChannelIdLocal] = useState<string | null>(persistedChannelId);
  const [activeDMId, setActiveDMIdLocal] = useState<string | null>(persistedDMId);
  // Inbox panel of the home view. Lifted here (it used to live in DMPage)
  // because DMSidebar and DMPage now mount in different columns.
  const [dmShowInbox, setDmShowInbox] = useState(false);
  const [activeThreadId, setActiveThreadIdLocal] = useState<string | null>(persistedThreadId);
  const [threadChannelId, setThreadChannelIdLocal] = useState<string | null>(persistedThreadChannelId);
  const [showDiscover, setShowDiscover] = useState(false);
  useEffect(() => {
    const open = () => { setFavoritesMode(false); setShowDiscover(true); };
    window.addEventListener('app:open-discover', open);
    return () => window.removeEventListener('app:open-discover', open);
  }, []);
  // Vue "Favoris" : la colonne de gauche liste les favoris, le reste affiche l'element ouvert.
  const [favoritesMode, setFavoritesMode] = useState(false);
  const favorites = useFavorites();
  useEffect(() => { if (!favorites.enabled) setFavoritesMode(false); }, [favorites.enabled]);
  // Vue principale ouverte depuis les raccourcis de la liste des salons.
  const [serverView, setServerView] = useState<ServerView | null>(null);
  useEffect(() => setServerView(null), [activeServerId]);
  const [showCreate, setShowCreate] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverSettingsInitialTab, setServerSettingsInitialTab] = useState<string | undefined>(undefined);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState<string | null>(null);
  const [searchInitialSubmit, setSearchInitialSubmit] = useState<
    { label: string; filters: import('@/hooks/useGlobalSearch').SearchFilters } | null
  >(null);
  const [showMembers, setShowMembers] = useState(true);
  const [tabletChannelsOpen, setTabletChannelsOpen] = useState(false);
  const [tabletMembersOpen, setTabletMembersOpen] = useState(false);
  const [voiceChatChannelId, setVoiceChatChannelId] = useState<string | null>(null);
  const [threadPanelFlex, setThreadPanelFlex] = useState(4); // flex ratio for thread panel
  const threadResizing = useRef(false);

  // Wrapper functions to persist navigation state
  const setActiveServerId = useCallback((id: string | null) => {
    setActiveServerIdLocal(id);
    setPersistedServerId(id);
  }, [setPersistedServerId]);
  
  const setActiveDMId = useCallback((id: string | null) => {
    setActiveDMIdLocal(id);
    setPersistedDMId(id);
  }, [setPersistedDMId]);

  const setActiveChannelId = useCallback((id: string | null) => {
    setActiveChannelIdLocal(id);
    setPersistedChannelId(id);
  }, [setPersistedChannelId]);

  const setActiveThreadId = useCallback((id: string | null) => {
    setActiveThreadIdLocal(id);
    setPersistedThreadId(id);
  }, [setPersistedThreadId]);

  const [newThreadMessageId, setNewThreadMessageId] = useState<string | null>(null);
  const setThreadChannelId = useCallback((id: string | null) => {
    setThreadChannelIdLocal(id);
    setPersistedThreadChannelId(id);
  }, [setPersistedThreadChannelId]);

  // --- History navigation (desktop) ---
  const buildHistoryState = useCallback((): HistoryViewState => ({
    serverId: activeServerId,
    channelId: activeChannelId,
    dmId: activeDMId,
    threadId: activeThreadId,
  }), [activeServerId, activeChannelId, activeDMId, activeThreadId]);

  const handleHistoryPop = useCallback((state: HistoryViewState) => {
    setActiveServerIdLocal(state.serverId);
    setPersistedServerId(state.serverId);
    setActiveChannelIdLocal(state.channelId);
    setPersistedChannelId(state.channelId);
    setActiveDMIdLocal(state.dmId);
    setPersistedDMId(state.dmId);
    setActiveThreadIdLocal(state.threadId);
    setPersistedThreadId(state.threadId);
  }, [setPersistedServerId, setPersistedChannelId, setPersistedDMId, setPersistedThreadId]);

  const { pushView, replaceView } = useHistoryNavigation(handleHistoryPop);

  // Replace initial history entry
  const initialReplaced = useRef(false);
  useEffect(() => {
    if (!isMobile && !initialReplaced.current) {
      initialReplaced.current = true;
      replaceView(buildHistoryState());
    }
  }, [isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push history on significant navigation changes (desktop only)
  const prevNavKey = useRef('');
  useEffect(() => {
    if (isMobile) return;
    const key = `${activeServerId}|${activeChannelId}|${activeDMId}|${activeThreadId}`;
    if (prevNavKey.current && prevNavKey.current !== key) {
      pushView({
        serverId: activeServerId,
        channelId: activeChannelId,
        dmId: activeDMId,
        threadId: activeThreadId,
      });
    }
    prevNavKey.current = key;
  }, [activeServerId, activeChannelId, activeDMId, activeThreadId, isMobile, pushView]);

  // Re-print Discord-style self-XSS warning on every active channel/DM/thread change.
  useEffect(() => {
    if (!activeChannelId && !activeDMId && !activeThreadId) return;
    void import('@/lib/self-xss-warning').then(({ logSelfXssRepeating }) => {
      logSelfXssRepeating();
    });
  }, [activeChannelId, activeDMId, activeThreadId]);

  // Data hooks
  const { data: servers = [], isLoading: serversLoading, isPending: serversPending } = useServers();
  const { data: publicServers = [] } = usePublicServers();
  
  // Prepare initial channels data from servers cache for instant display
  const initialChannelsData = useMemo(() => {
    if (!activeServerId) return undefined;
    const server = servers.find(s => s.id === activeServerId);
    if (!server) return undefined;
    
    return {
      categories: server.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: (cat as any).icon ?? null,
        position: cat.position ?? 0,
        channels: cat.channels.map(ch => ({
          id: ch.id,
          name: ch.name,
          type: ch.type as import('@/hooks/useChannels').ChannelType,
          description: ch.description ?? null,
          position: ch.position ?? 0,
          category_id: cat.id,
          server_id: activeServerId,
          icon_url: (ch as any).icon_url ?? null,
        })),
      })),
      orphanChannels: (server.orphanChannels || []).map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type as import('@/hooks/useChannels').ChannelType,
        description: ch.description ?? null,
        position: ch.position ?? 0,
        category_id: null,
        server_id: activeServerId,
        icon_url: (ch as any).icon_url ?? null,
      })),
    };
  }, [activeServerId, servers]);
  
  const { data: channelsData } = useChannels(activeServerId, initialChannelsData);
  const messagesQuery = useMessages(activeChannelId);
  const messages = messagesQuery.data ?? [];
  const loadOlderMessages = (messagesQuery as any).loadOlder as (() => Promise<number>) | undefined;
  const hasMoreOlder = (messagesQuery as any).hasMoreOlder as boolean | undefined;
  const { data: members = [] } = useMembers(activeServerId);

  // Cache-first preload: when a server opens, warm threads for every text-like
  // channel so popovers and embeds render synchronously the first time.
  const threadCapableChannelIds = useMemo(() => {
    if (!channelsData) return [] as string[];
    const ids: string[] = [];
    const accept = new Set(['text', 'announcement', 'forum', 'media']);
    channelsData.categories.forEach((cat) => cat.channels.forEach((ch) => {
      if (accept.has(ch.type as string)) ids.push(ch.id);
    }));
    channelsData.orphanChannels.forEach((ch) => {
      if (accept.has(ch.type as string)) ids.push(ch.id);
    });
    return ids;
  }, [channelsData]);
  usePrefetchThreadsForChannels(threadCapableChannelIds);

  // Cache-first preload: warm link metadata for every URL in the current
  // channel so LinkEmbed paints synchronously when scrolled into view.
  useEffect(() => {
    if (!messages.length) return;
    const urls = new Set<string>();
    for (const m of messages as { content?: string | null }[]) {
      if (!m.content) continue;
      for (const u of extractUrls(m.content)) urls.add(u);
    }
    if (urls.size) prefetchUrls(urls);
  }, [messages]);
  // Realtime profiles updates (DB -> postgres_changes)
  useProfilesRealtime();
  useDownloadPermissionsRecipientRealtime();
  
  // Realtime permissions updates (server-specific + global)
  usePermissionsRealtime(activeServerId);
  useGlobalPermissionsRealtime();

  // Realtime server assets (emojis, stickers, sounds) so imports appear instantly for everyone
  useServerAssetsRealtime(activeServerId);


  // Voice state
  const { voiceState, toggleMute, toggleDeafen, leaveChannel, isConnected } = useVoice();
  const { speakingUsers } = useVoiceLevels();
  const dmCallSession = useDMCallSession();
  const [showAccountSettingsGlobal, setShowAccountSettingsGlobal] = useState<false | string>(false);
  useEffect(() => {
    const on = (e: Event) => {
      const { channelId, messageId } = (e as CustomEvent<{ channelId: string; messageId: string | null }>).detail ?? {};
      if (!channelId) return;
      setNewThreadMessageId(messageId ?? null);
      setThreadChannelId(channelId);
      setThreadFullscreen(false);
      setActiveThreadId(NEW_THREAD_ID);
    };
    window.addEventListener(OPEN_NEW_THREAD_EVENT, on);
    return () => window.removeEventListener(OPEN_NEW_THREAD_EVENT, on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const open = (e: Event) => setShowAccountSettingsGlobal((e as CustomEvent<{ tab: string }>).detail?.tab || 'account');
    window.addEventListener(OPEN_USER_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_USER_SETTINGS_EVENT, open);
  }, []);

  // Mutations
  const createServer = useCreateServer();
  const joinServer = useJoinServer();
  const sendMessage = useSendMessage();

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onEscape: () => {
      if (showGlobalSearch) { setShowGlobalSearch(false); setSearchSubmitted(null); }
      else if (showShortcutsHelp) setShowShortcutsHelp(false);
      else if (showDiscover) setShowDiscover(false);
      else if (showCreate) setShowCreate(false);
      else if (showServerSettings) setShowServerSettings(false);
    },
    onSearch: () => {
      setShowGlobalSearch(true);
    },
    onShortcutsHelp: () => setShowShortcutsHelp(true),
    onToggleMute: () => {
      if (voiceState.channelId) {
        toggleMute();
      }
    },
  });


  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Set first server as active when servers load (only if not on home/DM view)
  useEffect(() => {
    if (servers.length > 0 && activeServerId === null && activeDMId === null) {
      // Start on home (DM) view by default
      // User can click a server to switch
    }
  }, [servers, activeServerId, activeDMId]);

  // Reactive redirect: if active server no longer exists (left/deleted), go to last visited server
  useEffect(() => {
    if (!activeServerId || !servers || serversPending) return;
    const stillExists = servers.some(s => s.id === activeServerId);
    if (stillExists) return;

    // Find last visited server from channelsByServer history
    const visitedServerIds = Object.keys(channelsByServer);
    const fallbackServer = visitedServerIds
      .filter(id => id !== activeServerId)
      .reverse()
      .find(id => servers.some(s => s.id === id));

    if (fallbackServer) {
      setActiveServerId(fallbackServer);
    } else if (servers.length > 0) {
      setActiveServerId(servers[0].id);
    } else {
      setActiveServerId(null);
    }
    setActiveChannelId(null);
    setActiveThreadId(null);
    setThreadChannelId(null);
  }, [activeServerId, servers, serversLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeServer = servers.find((s) => s.id === activeServerId);
  useEffect(() => {
    setDesktopTitle({ name: activeServer?.name ?? null, iconUrl: activeServer?.icon_url ?? null });
  }, [activeServer?.name, activeServer?.icon_url]);
  const resolvedCategories = channelsData?.categories ?? activeServer?.categories ?? [];
  const resolvedOrphanChannels = channelsData?.orphanChannels ?? activeServer?.orphanChannels ?? [];
  const activeChannel = resolvedCategories
    .flatMap((c) => c.channels)
    .find((ch) => ch.id === activeChannelId)
    || resolvedOrphanChannels.find((ch) => ch.id === activeChannelId);

  // Update active channel when server changes - restore last visited or first text channel
  useEffect(() => {
    if (activeServerId) {
      const server = servers.find(s => s.id === activeServerId);
      if (server) {
        const allChannels = [
          ...resolvedCategories.flatMap(c => c.channels),
          ...resolvedOrphanChannels,
        ];

        // If we already have a persisted channel for this server from session restore, use it
        if (activeChannelId) {
          const exists = allChannels.find(ch => ch.id === activeChannelId);
          if (exists) return; // already set and valid
        }

        // Try to restore last visited channel for this server
        const savedChannelId = getChannelForServer(activeServerId);

        const savedChannel = savedChannelId
          ? allChannels.find(ch => ch.id === savedChannelId)
          : null;

        if (savedChannel) {
          setActiveChannelId(savedChannel.id);
        } else {
          // Fallback to first available channel, prefer text-like channels when present
          const firstChannel = allChannels.find(ch => ch.type === 'text')
            || allChannels.find(ch => ch.type === 'announcement' || ch.type === 'forum' || ch.type === 'media')
            || allChannels[0];
          if (firstChannel) {
            setActiveChannelId(firstChannel.id);
            setChannelForServer(activeServerId, firstChannel.id);
          }
        }
      }
    }
  }, [activeServerId, activeChannelId, servers, resolvedCategories, resolvedOrphanChannels, getChannelForServer, setChannelForServer]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prepare channels and members for search modal
  const searchChannels = useMemo(() => {
    if (!activeServer) return [];
    const allChannels = [
      ...resolvedCategories.flatMap(cat => cat.channels),
      ...resolvedOrphanChannels
    ];
    return allChannels.map(ch => ({
      id: ch.id,
      name: ch.name,
      type: ch.type || 'text'
    }));
  }, [activeServer, resolvedCategories, resolvedOrphanChannels]);

  const searchMembers = useMemo(() => {
    return members.map(m => ({
      id: m.user.id,
      memberId: m.id,
      username: m.user.username,
      displayName: m.serverProfile?.display_name || m.nickname || m.user.display_name,
      avatar: m.serverProfile?.avatar_url || m.user.avatar_url || undefined,
      bio: m.serverProfile?.bio || m.user.bio || undefined,
    }));
  }, [members]);

  const handleSendMessage = (content: string, attachments?: any[], replyToId?: string | null, externalAttachment?: { url: string; name: string; type: 'sticker' | 'gif' }) => {
    if (!activeChannelId) return;
    sendMessage.mutate({ channelId: activeChannelId, content, attachments: attachments || [], replyToId: replyToId ?? null, externalAttachment });
  };

  const handleJoinServer = (serverId: string) => {
    joinServer.mutate(serverId, {
      onSuccess: () => {
        setShowDiscover(false);
        setActiveServerId(serverId);
        setActiveDMId(null);
      },
    });
  };

  const handleCreateServer = (name: string, iconFile: File | null, bannerFile: File | null, templateId?: string | null) => {
    createServer.mutate(
      { name, iconFile, bannerFile, is_public: false, templateId },
      {
        onSuccess: (server) => {
          setActiveServerId(server.id);
          setActiveDMId(null);
          setShowCreate(false);
        },
      }
    );
  };

  const handleOpenDM = (conversationId: string) => {
    setDmShowInbox(false);
    setActiveDMId(conversationId);
    setActiveServerId(null);
    setActiveChannelId(null);
  };

  const handleShowFriends = () => {
    setDmShowInbox(false);
    setActiveDMId(null);
  };

  const handleShowInbox = () => {
    setDmShowInbox(true);
  };

  const handleServerSelect = (serverId: string | null) => {
    setShowDiscover(false);
    setFavoritesMode(false);
    if (serverId === null) {
      // Home button clicked - show DM page
      setActiveServerId(null);
      setActiveChannelId(null);
    } else {
      setActiveServerId(serverId);
      setActiveDMId(null);
    }
  };

  // "Aller sur le serveur" depuis une carte d'invitation du chat.
  useEffect(() => {
    const onOpenServer = (e: Event) => {
      const { serverId, channelId, conversationId } = (e as CustomEvent<{ serverId: string | null; channelId?: string; conversationId?: string }>).detail ?? {};
      if (conversationId) {
        setActiveServerId(null);
        setActiveDMId(conversationId);
        return;
      }
      if (!serverId) return;
      setActiveServerId(serverId);
      setActiveDMId(null);
      if (channelId) setTimeout(() => setActiveChannelId(channelId), 50);
    };
    window.addEventListener(OPEN_SERVER_EVENT, onOpenServer);
    return () => window.removeEventListener(OPEN_SERVER_EVENT, onOpenServer);
  }, [setActiveServerId, setActiveDMId]);

  // Boite de reception > "Voir les demandes d'amis".
  useEffect(() => {
    const onOpenFriends = () => {
      setActiveServerId(null);
      setActiveDMId(null);
      setDmShowInbox(false);
    };
    window.addEventListener(OPEN_FRIENDS_EVENT, onOpenFriends);
    return () => window.removeEventListener(OPEN_FRIENDS_EVENT, onOpenFriends);
  }, [setActiveServerId, setActiveDMId]);

  const handleOpenServerSettings = (serverId?: string, initialTab?: string) => {
    if (serverId) {
      setActiveServerId(serverId);
    }
    setServerSettingsInitialTab(initialTab);
    setShowServerSettings(true);
  };

  const handleToggleMembers = () => {
    setShowMembers(!showMembers);
  };

  // Preloader — now runs only in background, without blocking the shell
  const preloader = usePreloader(authLoading, serversPending, servers);

  if (authLoading) {
    return <LoadingScreen progress={preloader.progress} currentStep={preloader.currentStep} />;
  }

  if (!user) {
    return null;
  }

  // Transform data for components - full Server type
  const serverListData: Server[] = servers.map(s => ({
    id: s.id,
    name: s.name,
    icon: s.icon_url || undefined,
    ownerId: s.owner_id || '',
    description: s.description || undefined,
    memberCount: 0,
    isPublic: s.is_public,
    categories: s.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: (cat as any).icon ?? null,
      channels: cat.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link',
        description: ch.description || undefined,
        icon_url: (ch as any).icon_url ?? null,
      })),
    })),
  }));

  const serverForChannelList = activeServer ? {
    id: activeServer.id,
    name: activeServer.name,
    ownerId: activeServer.owner_id || '',
    secondaryOwnerId: activeServer.secondary_owner_id || undefined,
    iconUrl: activeServer.icon_url || undefined,
    bannerUrl: activeServer.banner_url || undefined,
    description: activeServer.description || undefined,
    createdAt: activeServer.created_at || undefined,
    isPublic: !!activeServer.is_public,
    categories: resolvedCategories.map(cat => ({
      id: cat.id,
      name: cat.name,
      icon: (cat as any).icon ?? null,
      channels: cat.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: (ch.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage' | 'link',
        description: ch.description || undefined,
        icon_url: (ch as any).icon_url ?? null,
      })),
    })),
  } : null;

  const memberListData: (User & { roles?: MemberWithProfile['roles']; activity_type?: string | null; activity_text?: string | null })[] = members.map(m => ({
    id: m.user.id,
    username: m.user.username,
    displayName: m.serverProfile?.display_name || m.nickname || m.user.display_name,
    avatar: m.serverProfile?.avatar_url || m.user.avatar_url || undefined,
    banner: m.serverProfile?.banner_url || m.user.banner_url || undefined,
    status: m.user.status || 'offline',
    customStatus: m.user.custom_status || undefined,
    activity_type: m.user.activity_type,
    activity_text: m.user.activity_text,
    bio: m.serverProfile?.bio || m.user.bio || undefined,
    pronouns: m.serverProfile?.pronouns || m.user.pronouns || undefined,
    roles: m.roles,
  }));

  // Create member roles map for ChatArea
  const memberRolesMap = new Map<string, MemberWithProfile['roles']>();
  members.forEach(m => {
    memberRolesMap.set(m.user.id, m.roles);
  });

  const messagesData: Message[] = messages.map((m) => {
    const isSystemMessage = m.author === null || m.is_system === true;
    return {
      id: m.id,
      content: m.content,
      attachments: (m as any).attachments || [],
      isSystemMessage,
      is_system: m.is_system,
      edited_at: m.edited_at,
      author: m.author === null ? {
        id: 'system',
        username: 'system',
        displayName: 'Système',
        status: 'online' as const,
      } : {
        id: m.author?.id || '',
        username: m.author?.username || 'unknown',
        displayName: m.author?.display_name || 'Utilisateur inconnu',
        avatar: m.author?.avatar_url || undefined,
        status: m.author?.status || 'offline',
      },
      timestamp: new Date(m.created_at || Date.now()),
      published: m.is_published_message && m.source_server_name
        ? {
            sourceChannelId: m.source_channel_id ?? null,
            serverId: m.source_server_id ?? null,
            serverName: m.source_server_name,
            channelName: m.source_channel_name ?? null,
            serverIcon: m.source_server_icon ?? null,
          }
        : null,
      publishedAt: m.published_at ?? null,
      publishDismissed: !!m.publish_dismissed,
      replyToId: (m as any).reply_to_id ?? null,
      repliedMessage: (m as any).repliedMessage
        ? {
            id: (m as any).repliedMessage.id,
            content: (m as any).repliedMessage.content ?? '',
            attachments: (m as any).repliedMessage.attachments ?? [],
            deleted: (m as any).repliedMessage.deleted === true,
            author: (m as any).repliedMessage.author
              ? {
                  id: (m as any).repliedMessage.author.id,
                  username: (m as any).repliedMessage.author.username,
                  displayName:
                    (m as any).repliedMessage.author.display_name ||
                    (m as any).repliedMessage.author.username ||
                    'Utilisateur',
                  avatar: (m as any).repliedMessage.author.avatar_url || undefined,
                }
              : null,
          }
        : null,
    };
  });

  const channelForChat = activeChannel ? {
    id: activeChannel.id,
    name: activeChannel.name,
    type: (activeChannel.type || 'text') as 'text' | 'voice' | 'forum' | 'announcement' | 'media' | 'calendar' | 'tasks' | 'stage',
    description: activeChannel.description || undefined,
    server_id: activeServerId || undefined,
    icon_url: activeChannel.icon_url ?? null,
  } : null;

  // Filter public servers that user hasn't joined
  const discoverableServers: Server[] = publicServers
    .filter(ps => !servers.some(s => s.id === ps.id))
    .map(s => ({
      id: s.id,
      name: s.name,
      icon: s.icon_url || undefined,
      description: s.description || '',
      ownerId: s.owner_id || '',
      memberCount: Array.isArray(s.server_members) ? s.server_members.length : 0,
      isPublic: true,
      categories: [],
    }));

  // Determine if we're on home (DM) view
  const isHomeView = activeServerId === null;

  // Mobile layout
  if (isMobile) {
    return (
      <Suspense fallback={<Spinner />}>
        <MobileLayout
          servers={serverListData}
          activeServerId={activeServerId}
          activeDMId={activeDMId}
          onServerSelect={handleServerSelect}
          onOpenDM={handleOpenDM}
          onShowFriends={handleShowFriends}
          onJoinServer={handleJoinServer}
          onCreateServer={handleCreateServer}
          discoverableServers={discoverableServers}
          rawServers={servers}
        />
      </Suspense>
    );
  }

  // Channel list element (shared between desktop inline and tablet drawer)
  const channelListEl = activeServer && serverForChannelList ? (
    <ChannelList
      server={serverForChannelList}
      activeChannelId={activeChannelId}
      onChannelSelect={(channelId) => {
        setServerView(null);
        setActiveChannelId(channelId);
        if (activeServerId) {
          setChannelForServer(activeServerId, channelId);
        }
        setActiveThreadId(null);
        setThreadChannelId(null);
        if (isTablet) setTabletChannelsOpen(false);
      }}
      activeServerView={serverView}
      onOpenServerView={(view) => {
        setServerView(view);
        setActiveThreadId(null);
        if (isTablet) setTabletChannelsOpen(false);
      }}
      onOpenServerSettings={(initialTab) => {
        setServerSettingsInitialTab(initialTab);
        setShowServerSettings(true);
      }}
      orphanChannels={resolvedOrphanChannels as import('@/hooks/useChannels').OrphanChannel[]}
      activeThreadId={activeThreadId}
      onThreadSelect={(threadId) => {
        setActiveThreadId(threadId);
        setThreadChannelId(activeChannelId);
        // Depuis la liste des salons, le fil s'ouvre comme vue principale (fil d'Ariane, liste des membres a droite).
        setThreadFullscreen(true);
        if (isTablet) setTabletChannelsOpen(false);
      }}
      onOpenVoiceChat={(channelId) => {
        setActiveChannelId(channelId);
        if (activeServerId) {
          setChannelForServer(activeServerId, channelId);
        }
        setActiveThreadId(null);
        setThreadChannelId(null);
        setVoiceChatChannelId(channelId);
        if (isTablet) setTabletChannelsOpen(false);
      }}
    />
  ) : null;

  /*
   * User panel — desktop only, lives at the bottom of the sidebar rail.
   *
   * It used to be `position: fixed` with a hard-coded width of
   * `calc(80px + 2px + 240px)` plus a fixed 60px wrapper. Any change to the
   * rail width, or to the panel's own content height, desynchronised it from
   * the sidebar AND from the message composer sitting next to it. Rendering it
   * in normal flow makes width and height follow the rail automatically, which
   * is what makes the two bottom bars line up.
   */
  // --- Favoris ---
  const favoriteActiveKeys = [
    activeServerId === null && activeDMId ? `dm:${activeDMId}` : null,
    activeThreadId && activeThreadId !== NEW_THREAD_ID ? `thread:${activeThreadId}` : null,
    activeServerId && activeChannelId ? `channel:${activeChannelId}` : null,
  ].filter((k): k is string => !!k);
  const activeFavorite = favorites.items.find((i) => favoriteActiveKeys.includes(favKey(i))) ?? null;

  const openFavorite = (item: FavoriteItem) => {
    setShowDiscover(false);
    setServerView(null);
    if (item.kind === 'dm') {
      handleOpenDM(item.ref_id);
      setActiveThreadId(null);
      return;
    }
    if (!item.server_id) return;
    setActiveDMId(null);
    setDmShowInbox(false);
    setActiveServerId(item.server_id);
    const channelId = item.kind === 'thread' ? item.channel_id : item.ref_id;
    setTimeout(() => {
      if (channelId) {
        setActiveChannelId(channelId);
        setChannelForServer(item.server_id!, channelId);
      }
      if (item.kind === 'thread') {
        setThreadChannelId(channelId);
        setActiveThreadId(item.ref_id);
        setThreadFullscreen(true);
      } else {
        setActiveThreadId(null);
        setThreadChannelId(null);
      }
    }, 60);
  };

  const goToFavoriteServer = (item: FavoriteItem) => {
    setFavoritesMode(false);
    openFavorite(item);
    if (item.kind === 'thread') setTimeout(() => setThreadFullscreen(false), 80);
  };

  const favoritesSidebarEl = (
    <FavoritesSidebar activeKey={activeFavorite ? favKey(activeFavorite) : null} onOpen={openFavorite} onGoToServer={goToFavoriteServer} />
  );

  // Ecran partage (chat + fil) : deux cartes aux angles arrondis separees par une gouttiere (video de reference).
  const splitView = !!activeThreadId && !isTablet && !threadFullscreen && (channelForChat?.type === 'text' || channelForChat?.type === 'announcement');
  const dmView: DMView = dmShowInbox ? 'inbox' : activeDMId ? 'conversation' : 'friends';
  const dmSidebarEl = (
    <DMSidebar
      activeDMId={activeDMId}
      currentView={dmView}
      onConversationSelect={handleOpenDM}
      onShowFriends={handleShowFriends}
      onShowInbox={handleShowInbox}
    />
  );

  const userPanelEl = !isMobile && !isTablet ? (
    <div className="w-full rounded-lg overflow-hidden bg-[hsl(var(--user-panel))] border border-white/[0.03] shadow-[0_0_10px_rgba(0,0,0,0.25)]">
      {isConnected && voiceState.channelName && (
        <VoiceStatusBadge
          channelName={voiceState.channelName}
          serverName={voiceState.serverName}
          onDisconnect={() => leaveChannel()}
          connectedToProfile
        />
      )}
      {!isConnected && dmCallSession.joined && <DMCallStatusBadge />}
      <UserProfileCard
        inDMCall={!!dmCallSession.joined}
        onOpenSettings={() => setShowAccountSettingsGlobal('account')}
        onOpenProfile={() => setShowAccountSettingsGlobal('profile')}
        speakingUsers={speakingUsers}
        connectedToVoice={isConnected && !!voiceState.channelName}
      />
    </div>
  ) : null;

  const closeSearch = () => {
    setShowGlobalSearch(false);
    setSearchSubmitted(null);
    setSearchInitialSubmit(null);
  };

  const messageSearchEl = activeServer ? (
    <Suspense fallback={<Spinner />}>
      <MessageSearchPanel
        key={`search-panel-${activeServer.id}`}
        serverId={activeServer.id}
        serverName={activeServer.name}
        channels={searchChannels}
        members={searchMembers}
        onClose={closeSearch}
        onSubmittedChange={setSearchSubmitted}
        initialSubmit={searchInitialSubmit}
        // Comme Discord : "Aller" ouvre le salon et laisse les resultats affiches.
        onNavigateToMessage={(channelId) => {
          setActiveChannelId(channelId);
        }}
      />
    </Suspense>
  ) : null;

  const messageSearchPopoverEl = activeServer ? (
    <Suspense fallback={<Spinner />}>
    <MessageSearchPanel
      key={`search-popover-${activeServer.id}`}
      variant="popover"
      serverId={activeServer.id}
      serverName={activeServer.name}
      channels={searchChannels}
      members={searchMembers}
      onClose={closeSearch}
      onSubmittedChange={setSearchSubmitted}
      onPopoverSubmit={(s) => setSearchInitialSubmit(s)}
      onNavigateToMessage={(channelId) => {
        setActiveChannelId(channelId);
        closeSearch();
      }}
    />
    </Suspense>
  ) : null;

  const renderMemberList = (opts: { fillHeight?: boolean; className?: string }) =>
    activeServer && channelForChat?.type !== 'voice' && !activeThreadId ? (
      <MemberList
        members={memberListData}
        ownerId={activeServer.owner_id || ''}
        serverId={activeServer.id}
        onOpenDM={handleOpenDM}
        onOpenGlobalSearch={() => setShowGlobalSearch(true)}
        fillHeight={opts.fillHeight}
        className={opts.className}
      />
    ) : null;

  const memberListBase = renderMemberList({ fillHeight: true });
  // Version pour les Sheets tablette : pas de `fillHeight` (la hauteur est
  // contrôlée par le parent flex du Sheet) et flex-1 pour occuper l'espace
  // disponible sans déborder du conteneur `h-full overflow-hidden`.
  const memberListSheetBase = renderMemberList({ className: "flex-1 min-h-0" });

  // When a search has been submitted, MessageSearchPanel takes over the whole column.
  // Otherwise (showGlobalSearch && !submitted), MemberList stays mounted and the
  // Filters/History popover floats above it.
  const rightPanelEl = !memberListBase
    ? null
    : showGlobalSearch && searchSubmitted
      ? messageSearchEl
      : (
        <div className="relative w-full sm:w-[264px] h-full">
          {memberListBase}
          {showGlobalSearch && !searchSubmitted && (
            <>
              <button
                type="button"
                aria-label="Fermer la recherche"
                onClick={closeSearch}
                className="fixed inset-0 z-10 cursor-default bg-transparent"
              />
              {/* Verrou pixel-perfect recherche MemberList :
                  rangee de 48px, champ de 32px → top = (48 − 32) / 2 = 8px.
                  left = padding gauche (12px, pas de filet sur cette rangee).
                  right = padding (12px) + bouton boite de reception (24px)
                  + gap (12px) = 48px.
                  Recalculer ces valeurs a chaque changement de la rangee de
                  recherche de MemberList. */}
              <div className="absolute left-3 right-12 top-2 z-20">
                {messageSearchPopoverEl}
              </div>
            </>
          )}
        </div>
      );
  const memberListEl = rightPanelEl;

  const tabletMemberListEl = !memberListSheetBase
    ? null
    : showGlobalSearch && searchSubmitted
      ? messageSearchEl
      : (
        <div className="relative w-full sm:w-[264px] h-full flex flex-col">
          {memberListSheetBase}
          {showGlobalSearch && !searchSubmitted && (
            <>
              <button
                type="button"
                aria-label="Fermer la recherche"
                onClick={closeSearch}
                className="fixed inset-0 z-10 cursor-default bg-transparent"
              />
              <div className="absolute left-3 sm:left-[17px] right-[52px] sm:right-[56px] top-2 z-20">
                {messageSearchPopoverEl}
              </div>
            </>
          )}
        </div>
      );

  return (
    <div className="h-[100svh] flex bg-[hsl(var(--sidebar-background))] overflow-hidden">
      <IncomingCallWatcher activeConversationId={activeDMId} />
      {/* Server List - compact rail on tablet (64px) */}
      <div className={isTablet ? 'w-[64px] shrink-0 [&>div]:!w-[64px]' : 'shrink-0'}>
        <ServerList
          servers={serverListData}
          activeServerId={activeServerId}
          onServerSelect={handleServerSelect}
          onDiscoverClick={() => { setFavoritesMode(false); setShowDiscover((v) => !v); }}
          onCreateClick={() => setShowCreate(true)}
          onOpenServerSettings={handleOpenServerSettings}
          reserveUserPanel={!!userPanelEl}
          discoverActive={showDiscover}
          favoritesEnabled={favorites.enabled}
          favoritesActive={favoritesMode && !showDiscover}
          onFavoritesClick={() => { setShowDiscover(false); setFavoritesMode(true); }}
        />
      </div>

      {/*
       * Main panel. Like the reference, the channel list, the chat and the
       * member list sit in a single panel with a 1px border on its top and
       * left edges and a rounded top-left corner, a few pixels below the top
       * of the window. The rail and the channel list share the same grey, so
       * this border is the only thing separating them.
       */}
      <div className="flex-1 flex min-w-0 min-h-0 mt-[5px] [.desktop-content_&]:mt-0 rounded-tl-[12px] border-l border-t border-[hsl(var(--frame-border))]">
      {showDiscover ? (
        <div className="relative flex-1 flex min-w-0 min-h-0 rounded-tl-[11px] overflow-hidden">
          <Suspense fallback={<Spinner />}>
            <DiscoveryPage
              onJoinServer={handleJoinServer}
              joining={joinServer.isPending}
              onOpenServer={(id) => { setShowDiscover(false); setActiveServerId(id); setActiveDMId(null); }}
            />
          </Suspense>
          {userPanelEl && <div className="absolute bottom-2 -left-[65px] w-[337px] z-30">{userPanelEl}</div>}
        </div>
      ) : (<>
      {/*
       * Sidebar column. No width class here: ChannelList owns its own width
       * (it is user-resizable). The user panel floats over the bottom of the
       * rail AND of this column, 8px from the window edges, so it is
       * positioned against this column and pushed left over the rail
       * (72px rail + 1px panel border - 8px margin = 65px).
       */}
      {!isTablet && (favoritesMode || isHomeView || (activeServer && serverForChannelList)) && (
        <div className="relative flex flex-col shrink-0 min-h-0">
          {favoritesMode ? favoritesSidebarEl : isHomeView ? dmSidebarEl : channelListEl}
          {userPanelEl && (
            <div className="absolute bottom-2 right-1.5 -left-[63px] z-30">{userPanelEl}</div>
          )}
        </div>
      )}

      {/* Home/DM View */}
      {favoritesMode && !activeFavorite ? (
        <div className="flex-1 flex min-w-0 bg-background"><FavoritesEmpty /></div>
      ) : isHomeView ? (
        <>
          {isTablet && dmSidebarEl}
          <DMPage
            activeDMId={activeDMId}
            currentView={dmView}
            onConversationSelect={handleOpenDM}
            onShowFriends={handleShowFriends}
          />
        </>
      ) : activeServer && serverForChannelList ? (
        <>

          {/* Main Content Area - resizable split when thread is open */}
          <div className="flex-1 flex min-w-0 w-full overflow-x-hidden relative">
            {/* Tablet floating toggle buttons */}
            {isTablet && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTabletChannelsOpen(true)}
                  className="absolute top-2 left-2 z-30 h-9 w-9 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm"
                  aria-label="Ouvrir les salons"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                {memberListEl && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTabletMembersOpen(true)}
                    className="absolute top-2 right-2 z-30 h-9 w-9 bg-background/80 backdrop-blur-sm border border-border/40 shadow-sm"
                    aria-label="Ouvrir les membres"
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}

            {serverView && activeServerId && (
              <ServerViewPage
                view={serverView}
                serverId={activeServerId}
                onOpenChannel={(channelId) => {
                  setServerView(null);
                  setActiveChannelId(channelId);
                  setChannelForServer(activeServerId, channelId);
                }}
                onOpenSettings={(tab) => {
                  setServerSettingsInitialTab(tab);
                  setShowServerSettings(true);
                }}
              />
            )}

            {channelForChat && !serverView && (
              <div
                className={`${activeThreadId && (channelForChat.type === 'text' || channelForChat.type === 'announcement') ? (threadFullscreen ? 'hidden' : 'min-w-[300px]') : 'flex-1 min-w-0'} flex flex-col w-full overflow-hidden ${splitView ? 'rounded-r-xl border border-l-0 border-[hsl(var(--frame-border))] mb-1 bg-background' : ''}`}
                style={activeThreadId && (channelForChat.type === 'text' || channelForChat.type === 'announcement') && !threadFullscreen ? { flex: `${10 - threadPanelFlex} 1 0%` } : undefined}
              >
                {channelForChat.type === 'voice' ? (
                  <Suspense fallback={<Spinner />}>
                  <VoiceChannelView
                    key={channelForChat.id}
                    channel={channelForChat}
                    serverId={activeServer.id}
                    members={memberListData}
                    ownerId={activeServer.owner_id || ''}
                    onOpenDM={handleOpenDM}
                    initialShowChat={voiceChatChannelId === channelForChat.id}
                    onChatOpened={() => setVoiceChatChannelId(null)}
                  />
                  </Suspense>
                ) : channelForChat.type === 'media' ? (
                  <Suspense fallback={<Spinner />}>
                  <MediaChannel
                    key={channelForChat.id}
                    channel={channelForChat}
                    serverId={activeServerId ?? undefined}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                  </Suspense>
                ) : channelForChat.type === 'forum' ? (
                  <Suspense fallback={<Spinner />}>
                  <ForumChannel
                    key={channelForChat.id}
                    channel={channelForChat}
                    serverId={activeServerId ?? undefined}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                  </Suspense>

                ) : channelForChat.type === 'tasks' ? (
                  <Suspense fallback={<Spinner />}>
                  <TasksChannel
                    key={channelForChat.id}
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                  </Suspense>
                ) : channelForChat.type === 'calendar' ? (
                  <Suspense fallback={<Spinner />}>
                  <CalendarChannel
                    key={channelForChat.id}
                    channel={channelForChat}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                  />
                  </Suspense>
                ) : channelForChat.type === 'stage' ? (
                  <Suspense fallback={<Spinner />}>
                  <StageChannel
                    key={channelForChat.id}
                    channel={channelForChat}
                    serverId={activeServer.id}
                  />
                  </Suspense>
                ) : (
                  <ChatArea
                    key={channelForChat.id}
                    channel={channelForChat}
                    messages={messagesData}
                    onSendMessage={handleSendMessage}
                    memberRoles={memberRolesMap}
                    onOpenDM={handleOpenDM}
                    onToggleMembers={handleToggleMembers}
                    showMembers={showMembers}
                    onSelectThread={(threadId) => setActiveThreadId(threadId)}
                    activeThreadId={activeThreadId}
                    onCloseThread={() => {
                      setActiveThreadId(null);
                      setThreadChannelId(null);
                    }}
                    members={searchMembers}
                    onChannelSelect={(channelId) => {
                      setActiveChannelId(channelId);
                      if (activeServerId) {
                        setChannelForServer(activeServerId, channelId);
                      }
                      setActiveThreadId(null);
                      setThreadChannelId(null);
                    }}
                    onLoadOlder={loadOlderMessages}
                    hasMoreOlder={hasMoreOlder ?? false}
                    messagesLoading={messagesQuery.isLoading}
                    onOpenServerSettings={(tab) => handleOpenServerSettings(undefined, tab)}
                  />
                )}
              </div>
            )}

            {/* Thread View - resizable split with chat */}
            {activeThreadId && (channelForChat?.type === 'text' || channelForChat?.type === 'announcement') && (
              <>
              {/* Invisible resize handle (desktop only) */}
              {!isTablet && (
                <div
                  className="w-[11px] shrink-0 cursor-ew-resize bg-transparent z-10 relative"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    threadResizing.current = true;
                    const container = (e.currentTarget.parentElement as HTMLElement);
                    const startX = e.clientX;
                    const containerWidth = container.getBoundingClientRect().width;
                    const startFlex = threadPanelFlex;
                    const handleMouseMove = (ev: MouseEvent) => {
                      if (!threadResizing.current) return;
                      const delta = ev.clientX - startX;
                      const deltaRatio = (delta / containerWidth) * 10;
                      const newFlex = Math.max(2, Math.min(8, startFlex - deltaRatio));
                      setThreadPanelFlex(Math.round(newFlex * 10) / 10);
                    };
                    const handleMouseUp = () => {
                      threadResizing.current = false;
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                />
              )}
              <div
                className={cn('min-w-[300px]', splitView && 'rounded-xl border border-[hsl(var(--frame-border))] mb-1 overflow-hidden bg-background [&>div]:!border-l-0')}
                style={isTablet ? { flex: '1 1 0%' } : threadFullscreen ? { flex: '1 1 0%' } : { flex: `${threadPanelFlex} 1 0%` }}
              >
                <Suspense fallback={<Spinner />}>
                {activeThreadId === NEW_THREAD_ID ? (
                  <NewThreadPanel
                    channelId={threadChannelId || activeChannelId || ''}
                    serverId={activeServerId}
                    messageId={newThreadMessageId}
                    forcePublic={channelForChat?.type === 'announcement'}
                    onClose={() => { setActiveThreadId(null); setThreadChannelId(null); setNewThreadMessageId(null); }}
                    onCreated={(id) => { setNewThreadMessageId(null); setActiveThreadId(id); }}
                  />
                ) : (
                <ThreadView
                  threadId={activeThreadId}
                  channelId={threadChannelId || activeChannelId || undefined}
                  serverId={activeServerId}
                  channelName={channelForChat?.name || ''}
                  onBack={() => {
                    setActiveThreadId(null);
                    setThreadChannelId(null);
                    setThreadFullscreen(false);
                  }}
                  isFullscreen={isTablet ? true : threadFullscreen}
                  onToggleFullscreen={() => setThreadFullscreen(!threadFullscreen)}
                  onSwitchThread={(id) => setActiveThreadId(id)}
                  onToggleMembers={() => setShowMembers(!showMembers)}
                  membersOpen={showMembers}
                  favoriteTrail={favoritesMode && activeServer ? { serverName: activeServer.name, serverIcon: (activeServer as { icon_url?: string | null }).icon_url ?? null, onGoToServer: () => { const it = favorites.items.find((i) => i.kind === 'thread' && i.ref_id === activeThreadId); if (it) goToFavoriteServer(it); } } : undefined}
                />
                )}
                </Suspense>
              </div>
              </>
            )}
          </div>

          {/* Right Panel - Member List or Message Search inline (desktop only) */}
          {!serverView && channelForChat?.type !== 'voice' && (!activeThreadId || (threadFullscreen && activeThreadId !== NEW_THREAD_ID)) && (showMembers || showGlobalSearch) && !isTablet && memberListEl}
        </>
      ) : null}
      </>)}
      </div>

      {/* Tablet drawers */}
      {isTablet && channelListEl && (
        <Sheet open={tabletChannelsOpen} onOpenChange={setTabletChannelsOpen}>
          <SheetContent side="left" className="p-0 w-[280px] sm:max-w-[280px] border-r">
            <div className="h-full overflow-hidden">{channelListEl}</div>
          </SheetContent>
        </Sheet>
      )}
      {isTablet && tabletMemberListEl && (
        <Sheet open={tabletMembersOpen} onOpenChange={setTabletMembersOpen}>
          <SheetContent side="right" className="p-0 w-[280px] sm:max-w-[280px] border-l">
            <div className="h-full overflow-hidden">{tabletMemberListEl}</div>
          </SheetContent>
        </Sheet>
      )}


      {/* Processus d'accueil du serveur ouvert (nouveau membre) */}
      <MemberOnboardingGate serverId={activeServerId} />

      {/* Modals */}
      {showCreate && (
        <Suspense fallback={<Spinner />}>
          <CreateServerModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreateServer}
          />
        </Suspense>
      )}

      {showServerSettings && activeServer && (
        <Suspense fallback={<Spinner />}>
          <ServerSettingsModal
            serverId={activeServer.id}
            serverName={activeServer.name}
            onClose={() => { setShowServerSettings(false); setServerSettingsInitialTab(undefined); }}
            initialTab={serverSettingsInitialTab as any}
          />
        </Suspense>
      )}

      {showShortcutsHelp && (
        <Suspense fallback={<Spinner />}>
          <KeyboardShortcutsModal onClose={() => setShowShortcutsHelp(false)} />
        </Suspense>
      )}

      {/* Global search is rendered inline as MessageSearchPanel below (replacing MemberList). */}
      {showAccountSettingsGlobal && (
        <Suspense fallback={<Spinner />}>
          <AccountSettingsModal onClose={() => setShowAccountSettingsGlobal(false)} initialTab={showAccountSettingsGlobal || null} />
        </Suspense>
      )}
    </div>
  );
};

export default Index;
