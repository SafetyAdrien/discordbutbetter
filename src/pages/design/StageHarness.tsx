/**
 * Harnais du salon Conference et des nouvelles fenetres (route /design).
 * Donnees fictives injectees dans le cache react-query et un utilisateur
 * fictif fourni via AuthContext : aucune requete reelle n'est necessaire.
 *
 *   ?view=stage&state=idle|join|start|prelive|live
 *   ?view=modals&m=welcome|topic|edit|end|event|create
 *   ?view=checklist
 *   ?view=settings&tab=profile|access|security|automod|community|...
 *   ?view=search&mode=menu|panel
 *   ?view=events&m=list|empty|wizard|detail|created
 *   ?view=pages&p=guide|browse|members|boosts
 */
import { joinCallSession } from "@/lib/dmCallSession";
import { DMSidebar, DMPage } from "@/components/dm/DMPage";
import { FavoritesSidebar } from "@/components/favorites/FavoritesSidebar";
import { FavoritesEmpty } from "@/components/favorites/FavoritesEmpty";
import { getUserSettings, patchUserSettings } from "@/lib/userSettings";
import { Component, Suspense, useMemo, useState, type ReactNode } from "react";
import { DMConversation } from "@/components/dm/DMConversation";
import { useQueryClient } from "@tanstack/react-query";
import ThreadsPopover from "@/components/threads/ThreadsPopover";
import { NewThreadPanel } from "@/components/threads/NewThreadPanel";
import { ThreadSettingsPage } from "@/components/threads/ThreadSettingsPage";
import { DeleteThreadDialog } from "@/components/threads/DeleteThreadDialog";
import ThreadView from "@/components/threads/ThreadView";
import { ServerTagPicker } from "@/components/server-tags/ServerTagPicker";
import { UniversalMessageContextMenu } from "@/components/chat/UniversalMessageContextMenu";
import { UniversalMessageActions } from "@/components/chat/UniversalMessageActions";
import { ForwardMessageDialog } from "@/components/chat/ForwardMessageModal";
import { ForwardedFrame } from "@/components/chat/ForwardedFrame";
import type { ForwardPayload } from "@/lib/forwardMessage";
import { MessageAttachments } from "@/components/chat/MessageAttachments";
import { MediaUploadModal } from "@/components/chat/upload/MediaUploadModal";
import { AttachmentEditsPanel, useAttachmentEdits } from "@/components/chat/upload/AttachmentEditsPanel";
import { InboxButton } from "@/components/inbox/InboxButton";
import { InboxPanel } from "@/components/inbox/InboxPanel";
import { VoiceStatusBadge } from "@/components/layout/VoiceStatusBadge";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { ProfileEditor } from "@/components/profile/editor/ProfileEditor";
import { CustomStatusModal } from "@/components/profile/CustomStatusModal";
import { AuthContextOverride, type AuthContextType } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { StageChannel } from "@/components/channels/StageChannel";
import { StageEndConfirm, StageTopicModal, StageWelcomeModal } from "@/components/channels/stage/StageModals";
import { StageEventWizard } from "@/components/channels/stage/StageEventWizard";
import { CreateChannelModal } from "@/components/modals/CreateChannelModal";
import { CreateServerModal } from "@/components/modals/CreateServerModal";
import { ServerWelcomeChecklist } from "@/components/chat/ServerWelcomeChecklist";
import { ForumView } from "@/components/channels/forum/ForumView";
import { ForumTagModal } from "@/components/channel-settings/ForumTagModal";
import { useOpenForumPost } from "@/lib/forum";
import { DiscoveryPage } from "@/components/discovery/DiscoveryPage";
import { VoiceStatusModal } from "@/components/channels/voice/VoiceStatusModal";
import { EmojiStickerPicker } from "@/components/chat/EmojiStickerPicker";
import { setScreenShareInfo } from "@/lib/screenShareInfo";
import { VoiceEmptyState } from "@/components/channels/voice/VoiceEmptyState";
import { VoiceChannelView } from "@/components/channels/VoiceChannelView";
import { VoiceContextOverride, defaultVoiceContext } from "@/contexts/VoiceContext";
import { TooltipProvider as TP2 } from "@/components/ui/tooltip";
import { ServerList } from "@/components/layout/ServerList";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ServerSetupProgress } from "@/components/layout/ServerSetupProgress";
import { firstMessageQueryKey, useServerSetupProgress } from "@/hooks/useServerSetupProgress";
import { ServerSettingsModal } from "@/components/server-settings/ServerSettingsModal";
import { MessageSearchPanel } from "@/components/layout/MessageSearchPanel";
import type { StageParticipant, StageSession } from "@/types/stage";
import { EventsModal } from "@/components/events/EventsModal";
import { UserSettingsModal } from "@/components/user-settings/UserSettingsModal";
import { ChatArea } from "@/components/chat/ChatArea";
import { CreatePollModal } from "@/components/chat/CreatePollModal";
import { FollowChannelModal } from "@/components/channels/announcement/FollowChannelModal";
import type { Message } from "@/types/app";
import { ServerViewPage, type ServerView } from "@/components/server-views/ServerViews";

const NOOP = () => {};
const CHANNEL = { id: "stage-ch", name: "Conférence" };
const SERVER_ID = "s1";

const fakeAuth = {
  user: { id: "u1" },
  session: null,
  profile: { id: "u1", display_name: "Adrien", username: "adrien_moulin", avatar_url: null },
  loading: false,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ data: null, error: null }),
  signOut: async () => {},
  updateProfile: async () => {},
  updateStatus: async () => {},
} as unknown as AuthContextType;

function participant(id: string, userId: string, name: string, role: StageParticipant["role"], muted = true): StageParticipant {
  return {
    id,
    session_id: "sess-1",
    user_id: userId,
    role,
    is_muted: muted,
    is_video_on: false,
    joined_at: new Date().toISOString(),
    profile: { id: userId, username: name.toLowerCase(), display_name: name },
  };
}

function useSeedStage(state: string) {
  const qc = useQueryClient();
  useState(() => {
    for (const key of ["stage-session", "stage-participants", "stage-hand-requests"]) {
      qc.setQueryDefaults([key], { staleTime: Infinity });
    }
    if (state === "start") {
      // Toutes les permissions accordees : l'ecran "commencer" s'affiche.
      (supabase as unknown as { rpc: unknown }).rpc = async () => ({ data: true, error: null });
    }
    const session: StageSession | null =
      state === "idle" || state === "start"
        ? null
        : {
            id: "sess-1",
            channel_id: CHANNEL.id,
            status: state === "prelive" ? "pre_live" : "live",
            title: state === "prelive" ? CHANNEL.name : "Test",
            created_at: new Date().toISOString(),
          };
    qc.setQueryData(["stage-session", CHANNEL.id], session);
    const people =
      state === "join"
        ? [participant("p2", "u2", "Léa", "moderator", false), participant("p3", "u3", "Thomas", "audience")]
        : state === "live"
          ? [participant("p1", "u1", "Adrien", "moderator"), participant("p2", "u2", "Léa", "speaker", false), participant("p3", "u3", "Thomas", "audience"), participant("p4", "u4", "Nina", "audience")]
          : [participant("p1", "u1", "Adrien", "moderator")];
    qc.setQueryData(["stage-participants", "sess-1"], people);
    qc.setQueryData(["stage-hand-requests", "sess-1"], []);
    return null;
  });
}

function useSeedSettings() {
  const qc = useQueryClient();
  useState(() => {
    // Tag du serveur : configuration existante (SPCE) et 2 membres qui l'affichent.
    qc.setQueryDefaults(["server-tag"], { staleTime: Infinity });
    qc.setQueryDefaults(["server-tag-users"], { staleTime: Infinity });
    if (new URLSearchParams(window.location.search).get("tagcfg") !== "none") {
      qc.setQueryData(["server-tag", SERVER_ID], { id: "t1", server_id: SERVER_ID, name: "SPCE", badge_id: "planet", color: "#2880FB", enabled: true, version: 1, updated_at: new Date().toISOString() });
    } else {
      qc.setQueryData(["server-tag", SERVER_ID], null);
    }
    qc.setQueryData(["server-tag-users", SERVER_ID], 2);
    for (const key of ["roles", "members", "invites", "role-member-counts"]) {
      qc.setQueryDefaults([key], { staleTime: Infinity });
    }
    const role = (id: string, name: string, color: string, position: number, is_default = false) => ({
      id, name, color, position, is_default, hoist: false, icon_url: null, server_id: SERVER_ID, description: null,
      permissions: is_default ? ["send_messages", "read_messages", "view_channel"] : ["manage_messages", "kick_members"],
    });
    qc.setQueryData(["roles", SERVER_ID], [
      role("r1", "Modérateur", "#3498db", 2),
      role("r2", "nouveau rôle", "#99AAB5", 1),
      role("r0", "@everyone", "#99AAB5", 0, true),
    ]);
    const member = (id: string, name: string, roles: string[]) => ({
      id: `m-${id}`, nickname: null, joined_at: new Date().toISOString(),
      user: { id, username: name.toLowerCase(), display_name: name, avatar_url: null, banner_url: null, status: "online", custom_status: null, activity_type: null, activity_text: null, pronouns: null, bio: null },
      roles: roles.map((r) => ({ id: r, name: r, color: null, position: 1 })),
    });
    qc.setQueryData(["members", SERVER_ID], [member("u1", "Adrien", ["r1"]), member("u2", "Léa", [])]);
    return null;
  });
}

function SettingsView({ tab }: { tab: string }) {
  useSeedServer(false);
  useSeedSettings();
  return (
    <ServerSettingsModal
      serverId={SERVER_ID}
      serverName="Serveur de Test"
      onClose={NOOP}
      initialTab={tab as React.ComponentProps<typeof ServerSettingsModal>["initialTab"]}
    />
  );
}

function StageView({ state }: { state: string }) {
  useSeedStage(state);
  return (
    <div className="h-[100svh] flex bg-background">
      <StageChannel channel={CHANNEL} serverId={SERVER_ID} />
    </div>
  );
}

function ModalsView({ m }: { m: string }) {
  return (
    <div className="h-[100svh] bg-background" style={{ background: "radial-gradient(120% 90% at 50% 115%, #4b56d6 0%, #161865 55%, #08080f 100%)" }}>
      <StageWelcomeModal open={m === "welcome"} onClose={NOOP} />
      <StageTopicModal open={m === "topic" || m === "edit"} mode={m === "edit" ? "edit" : "start"} initialTopic={m === "edit" ? "Test" : ""} onClose={NOOP} onSubmit={NOOP} />
      <StageEndConfirm open={m === "end"} onClose={NOOP} onConfirm={NOOP} />
      <StageEventWizard open={m === "event"} onClose={NOOP} serverId={SERVER_ID} stageChannel={CHANNEL} />
      {m === "create" && <CreateChannelModal serverId={SERVER_ID} categoryId="c1" categoryName="Salons vocaux" onClose={NOOP} />}
      {m === "server" && <CreateServerModal onClose={NOOP} onCreate={NOOP} />}
    </div>
  );
}

/* Progression de la configuration : la ligne sous l'en-tete et la checklist
   partagent le meme etat ; "Simuler l'envoi" fait passer a l'etape suivante. */
function ChecklistView() {
  useSeedServer(false);
  const qc = useQueryClient();
  useState(() => {
    qc.setQueryDefaults(["server-setup-first-message"], { staleTime: Infinity });
    qc.setQueryData(firstMessageQueryKey(SERVER_ID, "u1"), false);
    qc.setQueryData(["servers"], (old: Array<Record<string, unknown>> | undefined) => old?.map((sv) => ({ ...sv, name: "Space Group", icon_url: "/favicon.ico" })));
    try {
      localStorage.setItem("server-welcome-checklist:" + SERVER_ID, JSON.stringify({ download: true, app: true }));
    } catch {
      /* stockage indisponible */
    }
    return null;
  });
  const setup = useServerSetupProgress(SERVER_ID);
  return (
    <div className="h-[100svh] flex bg-background">
      <aside className="w-[300px] shrink-0 bg-[hsl(var(--card))] border-r border-white/[0.06]">
        <div className="h-12 px-4 flex items-center border-b border-white/[0.06] text-base font-semibold text-white">Space Group</div>
        <ServerSetupProgress serverId={SERVER_ID} activeChannelId={null} onChannelSelect={NOOP} />
      </aside>
      <div className="flex-1 flex flex-col justify-end px-4 pb-10 gap-6">
        <ServerWelcomeChecklist
          serverName="Space Group"
          done={setup.done}
          onMarkLocal={setup.markLocal}
          onInvite={NOOP}
          onCustomizeIcon={NOOP}
          onFirstMessage={() => qc.setQueryData(firstMessageQueryKey(SERVER_ID, "u1"), true)}
          onAddApp={NOOP}
          onBoosts={NOOP}
        />
      </div>
    </div>
  );
}

const SEARCH_MEMBERS = [
  { id: "u1", username: "adrien_moulin", displayName: "Adrien" },
  { id: "u2", username: "lea", displayName: "Léa" },
  { id: "u3", username: "thomas", displayName: "Thomas" },
];
const SEARCH_CHANNELS = [
  { id: "c1", name: "général", type: "text" },
  { id: "c2", name: "Général", type: "voice" },
  { id: "c3", name: "annonces", type: "announcement" },
  { id: "c4", name: "calendrier", type: "calendar" },
];

/** Colonne des membres avec la recherche, comme dans Index (superposition ou panneau). */
function SearchView({ mode }: { mode: string }) {
  return (
    <div className="h-[100svh] flex bg-background">
      <div className="flex-1 border-b border-border h-12" />
      {mode === "panel" ? (
        <MessageSearchPanel
          serverId={SERVER_ID}
          serverName="Serveur de Test"
          channels={SEARCH_CHANNELS}
          members={SEARCH_MEMBERS}
          onClose={NOOP}
          initialSubmit={{ label: "de: adrien_moulin bonjour", filters: {} }}
        />
      ) : (
        <div className="w-[264px] h-full relative">
          <div className="h-12 px-3 flex items-center gap-3 border-b border-border">
            <div className="flex-1" />
            <span className="w-6" />
          </div>
          <div className="absolute left-3 right-12 top-2 z-20">
            <MessageSearchPanel
              variant="popover"
              serverId={SERVER_ID}
              serverName="Serveur de Test"
              channels={SEARCH_CHANNELS}
              members={SEARCH_MEMBERS}
              onClose={NOOP}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function useSeedServer(withEvents: boolean) {
  const qc = useQueryClient();
  useState(() => {
    for (const key of ["server-events", "server-event-interests", "channels", "servers", "server-settings", "members", "roles", "invites", "hidden-channels", "channels-last-activity", "server-onboarding", "server-member-accounts"]) {
      qc.setQueryDefaults([key], { staleTime: Infinity });
    }
    const ch = (id: string, name: string, type: string, category_id: string | null, position: number) => ({
      id, name, type, category_id, position, description: null, server_id: SERVER_ID, icon_url: null,
    });
    qc.setQueryData(["channels", SERVER_ID], {
      orphanChannels: [],
      categories: [
        { id: "c1", name: "Salons textuels", icon: null, position: 0, channels: [ch("t1", "général", "text", "c1", 0)] },
        { id: "c2", name: "Salons vocaux", icon: null, position: 1, channels: [ch("v1", "Général", "voice", "c2", 0)] },
      ],
    });
    qc.setQueryData(["servers"], [{
      id: SERVER_ID, name: "Test", icon_url: null, banner_url: null, description: null, owner_id: "u1", secondary_owner_id: null,
      created_at: "2026-10-23T06:00:00Z", is_public: false, categories: [],
    }]);
    qc.setQueryData(["server-settings", SERVER_ID], {
      id: "ss1", server_id: SERVER_ID, community_enabled: true, profile_banner_preset: "default", profile_traits: [],
      verification_level: "low", automod_rules: { mention_spam: { enabled: true, limit: 20 }, custom: { enabled: false, keywords: [], allow: [] } },
    });
    const member = (id: string, name: string, minutes: number) => ({
      id: `m-${id}`, nickname: null, joined_at: new Date(Date.now() - minutes * 60000).toISOString(),
      user: { id, username: name.toLowerCase() + "_moulin", display_name: name, avatar_url: null, banner_url: null, status: "online", custom_status: null, activity_type: null, activity_text: null, pronouns: null, bio: null },
      roles: [],
    });
    qc.setQueryData(["members", SERVER_ID], [member("u1", "Adrien", 44)]);
    qc.setQueryData(["roles", SERVER_ID], [{ id: "r0", name: "@everyone", color: "#99AAB5", position: 0, is_default: true, hoist: false, icon_url: null, server_id: SERVER_ID, description: null, permissions: [] }]);
    qc.setQueryData(["invites", SERVER_ID], [{ id: "i1", server_id: SERVER_ID, code: "bjrXZzjC", created_by: "u1", expires_at: new Date(Date.now() + 7 * 86400000).toISOString(), max_uses: null, uses: 0, is_permanent: false, created_at: new Date().toISOString() }]);
    qc.setQueryData(["hidden-channels", "u1", SERVER_ID], new Set<string>());
    qc.setQueryData(["channels-last-activity", SERVER_ID], new Map([["t1", new Date(Date.now() - 42 * 60000).toISOString()]]));
    qc.setQueryData(["server-member-accounts", SERVER_ID], new Map([["u1", { created: new Date(Date.now() - 7 * 365 * 86400000).toISOString(), invite: null }]]));
    qc.setQueryData(["server-onboarding", SERVER_ID], { server_id: SERVER_ID, enabled: false, default_channel_ids: [], prompts: [], guide: {} });
    const start = new Date(Date.now() + 17 * 60000);
    const events = withEvents ? [{
      id: "e1", server_id: SERVER_ID, creator_id: "u1", title: "Titre", description: "Test description",
      location_type: "voice", channel_id: "v1", location: null, starts_at: start.toISOString(), ends_at: null,
      recurrence: "weekly", cover_url: null, status: "scheduled", canceled_occurrences: [], created_at: new Date().toISOString(),
    }] : [];
    qc.setQueryData(["server-events", SERVER_ID], events);
    qc.setQueryData(["server-event-interests", SERVER_ID, events.map((e) => e.id).join(",")], withEvents ? [{ event_id: "e1", user_id: "u1", skipped_occurrences: [] }] : []);
    return null;
  });
}

function EventsView({ m }: { m: string }) {
  useSeedServer(m !== "empty" && m !== "wizard");
  return (
    <div className="h-[100svh] bg-background">
      <EventsModal serverId={SERVER_ID} open onClose={NOOP} startWithWizard={m === "wizard"} />
    </div>
  );
}

function PagesView({ p }: { p: string }) {
  useSeedServer(false);
  return (
    <div className="h-[100svh] flex bg-background">
      <ServerViewPage view={p as ServerView} serverId={SERVER_ID} onOpenChannel={NOOP} onOpenSettings={NOOP} />
    </div>
  );
}

function UserSettingsView({ page }: { page: string }) {
  useSeedServer(false);
  return (
    <div className="h-[100svh] bg-background">
      <UserSettingsModal onClose={NOOP} initialTab={page} />
    </div>
  );
}

function AnnounceView({ m }: { m: string }) {
  useSeedServer(false);
  const qc = useQueryClient();
  const ANN = { id: "ann1", name: "salon", type: "announcement" as const, server_id: SERVER_ID };
  const min = (n: number) => new Date(Date.now() - n * 60000);
  useState(() => {
    for (const k of ["polls", "channel-followers", "followed-channel-info", "admin-servers"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    const author = { id: "u1", display_name: "Adrien", avatar_url: null, username: "adrien_moulin" };
    const opt = (id: string, text: string, emoji: string | null = null) => ({ id, text, emoji, poll_id: "x", position: 0 });
    const vote = (id: string, option_id: string, user_id: string) => ({ id, option_id, user_id, poll_id: "x", created_at: min(5).toISOString(), user: { id: user_id, display_name: user_id === "u1" ? "Adrien" : "Léa", avatar_url: null } });
    qc.setQueryData(["polls", "channel", "ann1"], [
      { id: "p2", channel_id: "ann1", thread_id: null, author_id: "u1", question: "Ta question", allow_multiple: true, expires_at: min(30).toISOString(), closed_notified: true, created_at: min(50).toISOString(), author,
        options: [opt("a", "Ta réponse", "🌱"), opt("b", "La seconde", "🫘"), opt("c", "3")], votes: [vote("v1", "a", "u1"), vote("v2", "b", "u2")] },
      { id: "p1", channel_id: "ann1", thread_id: null, author_id: "u1", question: "On mange quoi ce soir ?", allow_multiple: false, expires_at: new Date(Date.now() + 59 * 60000).toISOString(), closed_notified: false, created_at: min(3).toISOString(), author,
        options: [opt("d", "Pizza", "🍕"), opt("e", "Sushis", "🍣"), opt("f", "Raclette")], votes: m === "voted" ? [vote("v3", "d", "u1"), vote("v4", "e", "u2")] : [vote("v4", "e", "u2")] },
    ]);
    qc.setQueryData(["channel-followers", "ann1"], [{ id: "f1", source_channel_id: "ann1", target_channel_id: "t9", follower_user_id: "u2", created_at: "", display_name: null }]);
    qc.setQueryData(["followed-channel-info", "src1"], { channel_name: "salon", server_id: "s9", server_name: "ADRIEN's HOUSE", server_icon_url: null, server_banner_url: null, server_description: "Mon p'tit monde avec la famille et mes amis.", server_created_at: "2023-12-01T00:00:00Z", member_count: 39, online_count: 17, is_member: true });
    qc.setQueryData(["admin-servers", "u1"], [{ id: SERVER_ID, name: "Test", icon_url: null, channels: [{ id: "t1", name: "test-annonce", type: "text" }] }]);
    return null;
  });
  const me = { id: "u1", username: "adrien_moulin", displayName: "Adrien", status: "online" as const };
  const messages: Message[] = [
    { id: "m1", content: "[SYSTEM:CHANNEL_FOLLOWED:src1]", author: me, timestamp: min(60), is_system: true },
    { id: "m2", content: "[SYSTEM:POLL_CLOSED:p2]", author: me, timestamp: min(29), is_system: true },
    { id: "m3", content: "Helloo ! C'est un message publié.", author: { ...me, id: "u2", displayName: "Léa" }, timestamp: min(20),
      published: { sourceChannelId: "src1", serverId: "s9", serverName: "ADRIEN's Announcement!", channelName: null, serverIcon: null } },
    { id: "m4", content: "Nouvelle annonce : la mise à jour est en ligne !", author: me, timestamp: min(10), publishedAt: null, publishDismissed: false },
  ];
  return (
    <div className="h-[100svh] flex bg-background">
      <div className="flex-1 flex flex-col min-w-0">
        <ChatArea channel={ANN} messages={messages} onSendMessage={NOOP} members={[]} />
      </div>
      {m === "create" && <CreatePollModal channelId="ann1" serverId={SERVER_ID} open onOpenChange={NOOP} />}
      {m === "follow" && <FollowChannelModal open onClose={NOOP} sourceChannelId="ann1" sourceChannelName="salon" sourceServerName="ADRIEN's HOUSE" onSuccess={NOOP} />}
    </div>
  );
}


/* Salons Forum / Multimedia : posts fictifs (fils) avec medias, tags et
   reaction par defaut. ?view=forum&mode=forum|media&m=gallery|list|empty|panel */
const svgImg = (a: string, b: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="300" fill="url(#g)"/><text x="200" y="165" font-size="64" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">AR</text></svg>`)}`;

function ForumHarnessView({ mode, m }: { mode: "forum" | "media"; m: string }) {
  const qc = useQueryClient();
  const CH = mode === "media" ? "media-ch" : "forum-ch";
  useState(() => {
    for (const k of ["forum-threads", "forum-tags", "forum-config", "channel-permission", "thread", "thread-messages", "thread-reactions", "thread-follow-set", "thread-follow", "channel-permissions", "roles"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    // Pas de base ici : u1 a toutes les permissions sur le salon.
    const rpc = supabase.rpc.bind(supabase);
    (supabase as unknown as { rpc: unknown }).rpc = (fn: string, args?: Record<string, unknown>) =>
      fn === "has_channel_permission" ? Promise.resolve({ data: true, error: null }) : rpc(fn as never, args as never);
    const tags = [
      { id: "t1", channel_id: CH, name: "Tag 1", moderated: false, emoji_id: null, emoji_name: null, position: 0 },
      { id: "t2", channel_id: CH, name: "Tag 2", moderated: false, emoji_id: null, emoji_name: "⭐", position: 1 },
      { id: "t3", channel_id: CH, name: "Tag 3", moderated: true, emoji_id: null, emoji_name: "🫡", position: 2 },
    ];
    qc.setQueryData(["forum-tags", CH], tags);
    qc.setQueryData(["forum-config", CH], {
      channel_id: CH, default_sort_order: 0, default_layout: m === "list" ? 1 : 2, default_tag_setting: "match_some", require_tag: true,
      hide_media_download_options: false, default_auto_archive_duration: 4320, default_reaction_emoji_id: null, default_reaction_emoji_name: "🔥",
      guidelines: mode === "media" ? "Send a quality pictures!\nDoesn't break the **rules**." : null, post_slowmode_seconds: 0, message_slowmode_seconds: 0, content_visibility: "default",
    });
    qc.setQueryData(["channel-permissions", CH], []);
    qc.setQueryDefaults(["channel-details"], { staleTime: Infinity });
    qc.setQueryDefaults(["channels"], { staleTime: Infinity });
    qc.setQueryData(["channel-details", CH], { id: CH, name: mode === "media" ? "high-quality-media" : "forum", description: null, type: mode, server_id: SERVER_ID, category_id: "c1", position: 0, slowmode_seconds: 0, icon_url: null });
    qc.setQueryData(["channels", SERVER_ID], { orphanChannels: [], categories: [{ id: "c1", name: "Salons textuels", icon: null, position: 0, channels: [] }] });
    qc.setQueryData(["roles", SERVER_ID], [{ id: "r0", name: "@everyone", is_default: true, position: 0, color: "#99AAB5", permissions: [] }]);
    const author = { id: "u1", username: "adrien_moulin", display_name: "Adrien", avatar_url: null };
    const min = (n: number) => new Date(Date.now() - n * 60000).toISOString();
    const att = (id: string, a: string, b: string, extra = {}) => ({ id, url: svgImg(a, b), name: `${id}.png`, type: "image", size: 1000, ...extra });
    const posts = m === "empty" ? [] : [
      { id: "p1", channel_id: CH, name: "Test Image", created_by: "u1", created_at: min(1), last_message_at: min(1), archived: false, locked: false, pinned: false, applied_tags: ["t1", "t3"], message_count: 2, thumbnail_url: null, spoiler: false, slowmode_seconds: 0, auto_archive_minutes: 4320, starter_message_id: "s1",
        starter: { id: "s1", content: "Description en question", created_at: min(1), author, attachments: [att("a1", "#5865f2", "#a64dff", { description: "logo" }), att("a2", "#2b6cf6", "#5aa1ff", { isSpoiler: true })] } },
      { id: "p2", channel_id: CH, name: "Mon premier rendu 3D", created_by: "u2", created_at: min(90), last_message_at: min(30), archived: false, locked: true, pinned: true, applied_tags: ["t2"], message_count: 5, thumbnail_url: null, spoiler: false, slowmode_seconds: 0, auto_archive_minutes: 4320, starter_message_id: "s2",
        starter: { id: "s2", content: "Qu'en pensez-vous ? Retours bienvenus.", created_at: min(90), author: { ...author, id: "u2", display_name: "Léa" }, attachments: mode === "media" ? [att("a3", "#f59e0b", "#ef4444")] : [] } },
      { id: "p3", channel_id: CH, name: "Ancien sujet fermé", created_by: "u1", created_at: min(5000), last_message_at: min(4000), archived: true, locked: false, pinned: false, applied_tags: [], message_count: 1, thumbnail_url: null, spoiler: false, slowmode_seconds: 0, auto_archive_minutes: 4320, starter_message_id: "s3",
        starter: { id: "s3", content: "Ce post est fermé.", created_at: min(5000), author, attachments: mode === "media" ? [att("a4", "#10b981", "#0ea5e9")] : [] } },
    ];
    qc.setQueryData(["forum-threads", CH], posts);
    qc.setQueryData(["thread-follow-set", "u1", posts.map((p) => p.id).join(",")], new Set(["p1"]));
    qc.setQueryData(["thread-reactions", posts.map((p) => p.starter_message_id)], { s1: [{ id: "x", message_id: "s1", user_id: "u1", emoji: "🔥", created_at: null }] });
    qc.setQueryData(["thread", "p1"], { id: "p1", channel_id: CH, name: "Test Image", created_by: "u1", message_id: null, created_at: min(1), archived: false, archived_at: null, last_message_at: min(1) });
    qc.setQueryData(["thread-messages", "p1"], [
      { id: "s1", thread_id: "p1", author_id: "u1", content: "Description en question", created_at: min(1), edited_at: null, reply_to_id: null, author, attachments: posts[0]?.starter.attachments ?? [] },
      { id: "r1", thread_id: "p1", author_id: "u2", content: "Super rendu !", created_at: min(0.5), edited_at: null, reply_to_id: null, author: { ...author, id: "u2", display_name: "Léa" }, attachments: [] },
    ]);
    return null;
  });
  const openPost = useOpenForumPost();
  return (
    <div className="h-[100svh] flex bg-background">
      <pre id="open-post" className="fixed bottom-1 right-1 z-50 text-[10px] text-white/60">{JSON.stringify(openPost)}</pre>
      <ForumView channel={{ id: CH, name: mode === "media" ? "high-quality-media" : "forum", type: mode, server_id: SERVER_ID }} mode={mode} serverId={SERVER_ID} onToggleMembers={NOOP} />
    </div>
  );
}


/* Fenetre "Creer un tag" avec emojis de serveur : ?view=tagmodal */
function TagModalHarnessView() {
  const qc = useQueryClient();
  const [saved, setSaved] = useState<string>("");
  useState(() => {
    const svg = (c: string, t: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' rx='14' fill='${c}'/><text x='32' y='42' font-size='30' text-anchor='middle' fill='white' font-family='sans-serif'>${t}</text></svg>`)}`;
    for (const k of [["picker-servers"], ["picker-emojis"], ["picker-stickers"], ["server-emojis"]]) qc.setQueryDefaults(k, { staleTime: Infinity });
    qc.setQueryData(["picker-servers", "u1"], [{ id: "s1", name: "BCord Lab", icon_url: null }]);
    const em = Array.from({ length: 6 }, (_, i) => ({ id: `e${i}`, name: `markDiscordButBetterIcon${i}`, url: svg(["#3498db", "#e91e63", "#2ecc71"][i % 3], String(i)), server_id: "s1", created_at: null }));
    qc.setQueryData(["picker-emojis", "s1"], em);
    qc.setQueryData(["server-emojis", "s1"], em);
    qc.setQueryData(["picker-stickers", "s1"], []);
    return null;
  });
  return (
    <div className="h-[100svh] bg-background">
      <ForumTagModal open tag={null} serverId="s1" onClose={NOOP} onSave={(i) => setSaved(JSON.stringify(i))} />
      <pre id="saved" className="fixed bottom-2 left-2 text-xs text-white">{saved}</pre>
    </div>
  );
}

/* Page Decouvrir : ?view=discover&section=servers|apps&tab=home|gaming|...&app=1&preview=1&empty=1 */
function DiscoverHarnessView({ section, tab, app, preview, empty }: { section: string; tab: string; app: boolean; preview: boolean; empty: boolean }) {
  const qc = useQueryClient();
  const [key] = useState(0);
  useState(() => {
    for (const k of ["discovery-servers", "discover-apps", "servers"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    const art = (a: string, b: string, t = "") => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="640" height="320" fill="url(#g)"/><text x="320" y="180" font-size="54" font-weight="800" fill="white" text-anchor="middle" font-family="sans-serif">${t}</text></svg>`)}`;
    const mk = (i: number, name: string, cat: string, members: number, online: number, desc: string, a: string, b: string) => ({ id: `d${i}`, name, description: desc, icon_url: null, banner_url: art(a, b, name.split(" ")[0].toUpperCase()), discovery_category: cat, member_count: members, online_count: online, created_at: null, is_member: false, is_community: i % 2 === 0 });
    const all = empty ? [] : [
      mk(1, "Atelier Pixel", "gaming", 4614219, 1094785, "Le serveur des créateurs de jeux indépendants : partage tes prototypes et trouve une équipe.", "#7b2ff7", "#f107a3"),
      mk(2, "Nébuleuse Studio", "entertainment", 18227458, 555697, "Un lieu où ton imagination est la seule limite : arts, générateurs d'images et inspiration.", "#00c6ff", "#ff0080"),
      mk(3, "Cubes & Caves", "gaming", 4187026, 469701, "La communauté officielle des constructeurs. Retrouve les dernières nouvelles et des serveurs amis.", "#b24592", "#f15f79"),
      mk(4, "Lofi Garage", "music", 71130, 7000, "La communauté la plus chaleureuse pour écouter de la musique tranquille ensemble.", "#11998e", "#38ef7d"),
      mk(5, "Code Cabane", "science_tech", 253000, 31000, "Apprends à programmer avec des développeurs, des passionnés et des mentors bienveillants.", "#0f2027", "#2c5364"),
      mk(6, "Révisions 24/7", "education", 44163, 5100, "Étudie en direct avec d'autres étudiants : salons de travail silencieux et entraide.", "#f2994a", "#f2c94c"),
    ];
    for (const c of [null, "gaming", "music", "entertainment", "science_tech", "education"]) qc.setQueryData(["discovery-servers", c, ""], c ? all.filter((x) => x.discovery_category === c) : all);
    qc.setQueryData(["servers"], []);
    const apps = empty ? [] : [
      { id: "a1", name: "Échecs au Parc", tagline: "Libère ton grand maître intérieur en jouant plusieurs parties d'échecs à la fois.", description: "Découvre une **Activité** pour jouer aux échecs entre amis.\n\n## Comment jouer\n1. Lance l'activité dans un salon vocal.\n2. Crée ta partie ou rejoins-en une.\n\nLes parties sont partagées sur ton serveur, tu peux donc jouer ou regarder avec tes amis. Ces instructions peuvent être légèrement différentes sur mobile. ".repeat(3), icon_url: null, banner_url: art("#4caf50", "#cddc39", "PARC"), category: "games", section: "Jeux de société", featured: true, server_count: 63000, languages: ["Français, France", "Anglais, États-Unis"], commands: [{ name: "/enable-notifications", description: "Active les notifications de tour pour tes parties." }, { name: "/disable-notifications", description: "Désactive les notifications de tour." }], links: [{ label: "FAQ", url: "https://example.com/faq", kind: "faq" }, { label: "Conditions d'utilisation", url: "https://example.com/terms", kind: "terms" }, { label: "Politique de Confidentialité", url: "https://example.com/privacy", kind: "privacy" }], gallery: [art("#7e57c2", "#b39ddb", "Plateau"), art("#26a69a", "#80cbc4", "Salon")], position: 0 },
      { id: "a2", name: "Mots Quotidiens", tagline: "Une grille de mots à résoudre chaque jour, en équipe.", description: "Un puzzle de mots par jour.", icon_url: null, banner_url: art("#5c6bc0", "#9fa8da", "MOTS"), category: "games", section: "Jeux de réflexion", featured: false, server_count: 9100, languages: [], commands: [], links: [], gallery: [], position: 1 },
      { id: "a3", name: "Sudoku Ensemble", tagline: "Résous des grilles infinies avec tes amis.", description: "Sudoku coopératif.", icon_url: null, banner_url: art("#42a5f5", "#e3f2fd", "SUDOKU"), category: "games", section: "Jeux de réflexion", featured: false, server_count: 4200, languages: [], commands: [], links: [], gallery: [], position: 2 },
      { id: "a4", name: "Modo Plus", tagline: "Modération automatique, journaux et tickets pour ta communauté.", description: "Outils de modération.", icon_url: null, banner_url: art("#212121", "#616161", "MODO"), category: "moderation", section: "", featured: false, server_count: 120000, languages: [], commands: [], links: [], gallery: [], position: 3 },
    ];
    qc.setQueryData(["discover-apps"], apps);
    return null;
  });
  void key;
  return <div className="h-[100svh] flex bg-[hsl(var(--sidebar-background))]"><div className="flex-1 flex min-w-0 min-h-0"><DiscoveryPageHarness section={section} tab={tab} app={app} preview={preview} /></div></div>;
}

function DiscoveryPageHarness({ section, tab, app, preview }: { section: string; tab: string; app: boolean; preview: boolean }) {
  // Pilote la page par des clics simules : section, onglet puis fiche / apercu.
  useState(() => {
    setTimeout(() => {
      const click = (sel: string, text: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.trim() === text)?.click();
      if (section === "apps") click("nav button", "Applications");
      setTimeout(() => {
        if (tab !== "home") {
          const label = ({ gaming: "Gaming", music: "Musique", entertainment: "Divertissement", science_tech: "Science et technologie", education: "Éducation", hubs: "Pôles étudiants", games: "Jeux", moderation: "Modération et Outils" } as Record<string, string>)[tab];
          if (label) click("[role=tab]", label);
        }
        setTimeout(() => {
          if (app) (document.querySelector("button.group") as HTMLElement | null)?.click();
          if (preview) (document.querySelector("button.group") as HTMLElement | null)?.click();
        }, 400);
      }, 400);
    }, 600);
    return null;
  });
  return <DiscoveryPage onJoinServer={NOOP} onOpenServer={NOOP} />;
}

/* Boite de reception (titre de la fenetre de bureau) : ?view=inbox&tab=unread|mentions|saved|reminders */
function InboxHarnessView({ tab }: { tab: string }) {
  const qc = useQueryClient();
  useState(() => {
    qc.setQueryDefaults(["notifications"], { staleTime: Infinity });
    qc.setQueryDefaults(["channel-mention-notifications"], { staleTime: Infinity });
    const ago = (m: number) => new Date(Date.now() - m * 60000).toISOString();
    qc.setQueryData(["channel-mention-notifications", "u1"], [
      { id: "m1", mentionId: "m1", channelId: "c1", serverId: "s1", channelName: "reseaux-sociaux", serverName: "SuperSamaWorld", serverIconUrl: null, authorId: "x", authorName: "MonaVivi", authorAvatarUrl: null, content: "@NotifTwitter @NotifInsta La survie a ouvert il y a plus d'une semaine, les joueurs progressent bien", createdAt: ago(60 * 24 * 12) },
      { id: "m2", mentionId: "m2", channelId: "c2", serverId: "s1", channelName: "info-survie", serverName: "SuperSamaWorld", serverIconUrl: null, authorId: "y", authorName: "Nach marrons", authorAvatarUrl: null, content: "Le combat contre le dragon commencera dans 1 heure", createdAt: ago(60 * 24 * 3) },
      { id: "m3", mentionId: "m3", channelId: "c2", serverId: "s1", channelName: "info-survie", serverName: "SuperSamaWorld", serverIconUrl: null, authorId: "z", authorName: "Hache vitrée", authorAvatarUrl: null, content: "Bonjour tout le monde. Normalement, la survie se termine ce soir.", createdAt: ago(60 * 24) },
    ]);
    qc.setQueryData(["notifications"], []);
    return null;
  });
  return (
    <div className="h-[100svh] bg-background flex justify-end items-start p-1">
      <InboxPanelHarness tab={tab} />
    </div>
  );
}

function InboxPanelHarness({ tab }: { tab: string }) {
  useState(() => {
    // Ouvre directement l'onglet demande via un clic simule apres le montage.
    setTimeout(() => {
      const t = [...document.querySelectorAll('[role="tab"]')].find((el) => el.textContent?.toLowerCase().includes({ unread: 'non lus', mentions: 'mentions', saved: 'marqués', reminders: 'rappels' }[tab] ?? 'non lus')) as HTMLElement | undefined;
      t?.click();
    }, 400);
    return null;
  });
  return (
    <div className="w-[675px] rounded-lg overflow-hidden bg-[hsl(var(--input))] border border-[hsl(var(--border-subtle))] shadow-xl">
      <InboxPanel onOpenFriends={NOOP} />
    </div>
  );
}

/* Rail de serveurs avec dossiers (ferme, ouvert, non nomme) : ?view=folders&open=1 */
function FoldersView({ open }: { open: boolean }) {
  const qc = useQueryClient();
  const mk = (id: string, name: string, _hue: number) => ({
    id, name, ownerId: "x", memberCount: 1, isPublic: false, categories: [],
  });
  const servers = [mk("a", "Alpha", 10), mk("b", "Bravo", 120), mk("c", "Charlie", 200), mk("d", "Delta", 280), mk("e", "Echo", 40), mk("f", "Foxtrot", 330), mk("g", "Golf", 160)];
  useState(() => {
    qc.setQueryDefaults(["server-folders"], { staleTime: Infinity });
    qc.setQueryData(["server-folders", "u1"], [
      { id: "f1", name: "Mes serveurs", color: "#3498db", serverIds: ["b", "c", "d"], position: 1, expanded: false },
      { id: "f2", name: null, color: null, serverIds: ["e", "f"], position: 3, expanded: open },
    ]);
    return null;
  });
  return (
    <TooltipProvider delayDuration={0}>
      <div className="h-[100svh] w-[72px]">
        <ServerList servers={servers} activeServerId="c" onServerSelect={NOOP} onDiscoverClick={NOOP} onCreateClick={NOOP} />
      </div>
    </TooltipProvider>
  );
}

/* Vue du salon vocal : ?view=voice&state=empty|alone&chat=1 */
function VoiceHarnessView({ state, chat }: { state: string; chat: boolean }) {
  const qc = useQueryClient();
  useState(() => {
    qc.setQueryDefaults(["voice-participants"], { staleTime: Infinity });
    qc.setQueryData(["voice-participants", "vc1"], state === "empty" ? [] : [
      { id: "p1", user_id: "u1", channel_id: "vc1", muted: false, deafened: false, camera: false, streaming: false, joined_at: new Date().toISOString(), profile: { id: "u1", username: "adrien", display_name: "Adrien", avatar_url: null } },
    ]);
    return null;
  });
  // ?state=share : partage d'ecran factice (flux d'un canvas) pour revoir la mise en page.
  const [fake] = useState(() => {
    if (state !== "share") return null;
    const c = document.createElement("canvas"); c.width = 1280; c.height = 720;
    const g = c.getContext("2d")!; g.fillStyle = "#1b2a49"; g.fillRect(0, 0, 1280, 720); g.fillStyle = "#fff"; g.font = "48px sans-serif"; g.fillText("Ecran partage", 80, 120);
    return c.captureStream(5);
  });
  if (state === "share") setScreenShareInfo({ height: 1080, fps: 30 });
  const value = { ...defaultVoiceContext, isScreenSharing: state === "share", localScreenStream: fake, voiceState: { ...defaultVoiceContext.voiceState, channelId: state === "empty" ? null : "vc1", serverName: "Testing Features" } };
  return (
    <VoiceContextOverride value={value}>
      <TP2 delayDuration={0}>
        <div className="h-[100svh] flex bg-background">
          <VoiceChannelView channel={{ id: "vc1", name: "Général" }} serverId="s1" members={[]} ownerId="u1" onOpenDM={NOOP} initialShowChat={chat} />
        </div>
      </TP2>
    </VoiceContextOverride>
  );
}

/* Selecteur universel : ?view=picker&tab=emoji|sticker|gif */
function PickerHarnessView({ tab }: { tab: "emoji" | "sticker" | "gif" }) {
  const qc = useQueryClient();
  useState(() => {
    const svg = (c: string, t: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' rx='14' fill='${c}'/><text x='32' y='42' font-size='30' text-anchor='middle' fill='white' font-family='sans-serif'>${t}</text></svg>`)}`;
    for (const k of [["picker-servers"], ["picker-emojis"], ["picker-stickers"]]) qc.setQueryDefaults(k, { staleTime: Infinity });
    qc.setQueryData(["picker-servers", "u1"], [{ id: "s1", name: "Testing Features", icon_url: null }, { id: "s2", name: "ADRIEN's HOUSE", icon_url: svg("#5865f2", "A") }]);
    qc.setQueryData(["picker-emojis", "s1,s2"], Array.from({ length: 14 }, (_, i) => ({ id: `e${i}`, name: `Logo${i}`, url: svg(["#3498db", "#e91e63", "#2ecc71", "#f1c40f"][i % 4], String(i)), server_id: "s2", created_at: null })));
    qc.setQueryData(["picker-stickers", "s1,s2"], Array.from({ length: 5 }, (_, i) => ({ id: `st${i}`, name: `Sticker${i}`, description: null, url: svg(["#9b59b6", "#e67e22", "#1abc9c"][i % 3], "S"), server_id: "s2", created_at: null })));
    return null;
  });
  return (
    <div className="h-[100svh] flex items-end justify-center pb-6 bg-background">
      <EmojiStickerPicker serverId="s1" defaultTab={tab} onEmojiSelect={NOOP} onStickerSelect={NOOP} onGifSelect={NOOP} trigger={<button type="button" id="pk" className="h-10 px-4 rounded bg-primary text-white">Ouvrir</button>} />
    </div>
  );
}

/* Fils : ?view=threads&m=list|new|panel|full|settings|delete|bellmenu */
function ThreadsHarnessView({ m }: { m: string }) {
  const qc = useQueryClient();
  const author = { id: "u1", username: "adrien_moulin", display_name: "Adrien", avatar_url: null };
  const thread = { id: "th1", channel_id: "ch1", name: "Nouveau fil", created_by: "u1", message_id: null, created_at: new Date(Date.now() - 60000).toISOString(), archived: false, archived_at: null, last_message_at: new Date(Date.now() - 60000).toISOString(), locked: m === "locked", closed: false, slowmode_seconds: 0, auto_archive_minutes: 4320, spoiler: false, creator: author, message_count: 1, last_message: { content: "Premier message.", created_at: new Date(Date.now() - 60000).toISOString(), author } };
  const old = { ...thread, id: "th0", name: "Test Fil créé", created_at: new Date(Date.now() - 9e8).toISOString(), last_message_at: new Date(Date.now() - 9e8).toISOString(), last_message: { content: "Ici", created_at: new Date(Date.now() - 9e8).toISOString(), author } };
  useState(() => {
    for (const k of ["threads", "thread", "thread-messages", "followed-threads", "thread-follow", "thread-notification-prefs", "channels", "thread-reactions", "thread-polls"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    for (const k of ["members", "roles"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    qc.setQueryData(["roles", "s1"], [
      { id: "r0", name: "@everyone", color: null, icon_url: null, position: 0, is_default: true, hoist: false, server_id: "s1", description: null, permissions: [] },
      { id: "r1", name: "Modérateurs", color: "#2ecc71", icon_url: null, position: 3, is_default: false, hoist: true, server_id: "s1", description: null, permissions: [] },
      { id: "r2", name: "Équipe", color: "#e67e22", icon_url: null, position: 2, is_default: false, hoist: false, server_id: "s1", description: null, permissions: [] },
      { id: "r3", name: "Membres VIP", color: "#9b59b6", icon_url: null, position: 1, is_default: false, hoist: false, server_id: "s1", description: null, permissions: [] },
    ]);
    const mem = (id: string, name: string, username: string) => ({ id: `m-${id}`, nickname: null, joined_at: null, user: { id, username, display_name: name, avatar_url: null, banner_url: null, status: "online", custom_status: null, activity_type: null, activity_text: null, pronouns: null, bio: null }, roles: [], serverProfile: null });
    qc.setQueryData(["members", "s1"], [mem("u1", "Adrien", "adrien_moulin"), mem("u2", "Camille", "camille"), mem("u3", "Jules", "jules_b"), mem("u4", "Sarah", "sarah.k")]);
    qc.setQueryData(["threads", "ch1"], [thread, old]);
    qc.setQueryData(["followed-threads", "ch1", "u1"], [thread]);
    qc.setQueryData(["thread", "th1"], thread);
    qc.setQueryData(["thread-messages", "th1"], [{ id: "tm1", thread_id: "th1", author_id: "u1", content: "Premier message.", created_at: new Date(Date.now() - 60000).toISOString(), attachments: [], author }]);
    qc.setQueryData(["thread-follow", "th1", "u1"], true);
    qc.setQueryData(["thread-notification-prefs", "th1", "u1"], { level: "all", mutedUntil: null });
    return null;
  });
  return (
    <div className="h-[100svh] bg-background flex">
      {m === "list" && <div className="m-6 w-[674px] rounded-lg bg-[#383840] border border-white/[0.06] shadow-xl"><ThreadsPopover channelId="ch1" onSelectThread={NOOP} /></div>}
      {m === "new" && <div className="ml-auto w-[575px] h-full"><NewThreadPanel channelId="ch1" serverId="s1" onClose={NOOP} onCreated={NOOP} /></div>}
      {(m === "panel" || m === "full" || m === "locked") && (
        <div className={m === "full" ? "flex-1 h-full" : "ml-auto w-[575px] h-full"}>
          <ThreadView threadId="th1" channelId="ch1" serverId={null} channelName="général" onBack={NOOP} isFullscreen={m === "full"} onToggleFullscreen={NOOP} />
        </div>
      )}
      {m === "settings" && <ThreadSettingsPage thread={thread as never} channelName="général" onClose={NOOP} onDelete={NOOP} />}
      {m === "delete" && <DeleteThreadDialog open onOpenChange={NOOP} name="Nouveau fil" onConfirm={NOOP} />}
    </div>
  );
}

/* Selecteur de tag (parametres de profil) : ?view=tagpicker */
function TagPickerHarnessView() {
  const qc = useQueryClient();
  const auth = useMemo(() => ({ ...fakeAuth, user: { id: "u1" } }), []);
  useState(() => {
    for (const k of ["my-server-tags", "user-server-tag"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    const mk = (id: string, name: string, tag: string, badge: string, color: string | null) => ({ id: `t-${id}`, server_id: id, name: tag, badge_id: badge, color, enabled: true, version: 1, updated_at: "", server_name: name, server_icon: null, server_description: null, server_is_public: true });
    qc.setQueryData(["my-server-tags", "u1"], [mk("s1", "Spacebase", "SPCE", "planet", "#2880FB"), mk("s2", "Jardinage", "LEAF", "sprout", null), mk("s3", "Les Brûlés", "FIRE", "flame", "#f08a24")]);
    qc.setQueryData(["user-server-tag", "raw", "u1"], { server_id: "s1", applied_version: 1, selected_at: new Date().toISOString() });
    qc.setQueryData(["user-server-tag", "u1"], { userId: "u1", serverId: "s1", name: "SPCE", badgeId: "planet", color: "#2880FB" });
    return null;
  });
  return (
    <AuthContextOverride value={auth as AuthContextType}>
      <div className="min-h-[100svh] bg-[#313139] p-6"><div className="max-w-[320px]"><ServerTagPicker /></div></div>
    </AuthContextOverride>
  );
}

class HarnessBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { err }; }
  render() { return this.state.err ? <pre className="p-6 text-xs text-red-400 whitespace-pre-wrap">{this.state.err.stack}</pre> : this.props.children; }
}

/* MP : ?view=dms&m=friends|add|pending|conv|stranger (donnees seedees) */
function DMsHarnessView({ m }: { m: string }) {
  const qc = useQueryClient();
  const auth = useMemo(() => ({ ...fakeAuth, user: { id: "u1" } }), []);
  const mk = (id: string, name: string, username: string, st: string, cs: string | null) => ({ id, username, display_name: name, avatar_url: null, status: st, custom_status: cs });
  useState(() => {
    for (const k of ["friends", "dm-conversations", "dm-messages", "unread-counts", "dm-mention-counts", "dm-pinned", "profile", "mutual-friends", "mutual-servers", "user-note"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    const art = (c: string, t: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="${c}"/><text x="40" y="54" fill="#fff" font-size="34" text-anchor="middle">${t}</text></svg>`);
    qc.setQueryData(["profile", "u2", "full"], {
      id: "u2", username: "adrien_sama", display_name: "Adrien_Sama", avatar_url: art("#4b3fc9", "A"), banner_url: null, status: "dnd", created_at: "2016-10-05T10:00:00Z",
      pronouns: "GAMER", theme_color: null, theme_gradient: "#003468,#0080fb", custom_status: null, activity_type: null, activity_text: null,
      bio: "`CEO` **@Archives Previews**\n`ADMIN` **@Space Group**\nhttps://discord.gg/w5HvD7pGMBabcdefghijklmnop\n\nGaming account.",
      connections: [{ provider: "bluesky", value: "archivespreviews.com", stats: { account_created_at: "2026-01-06T00:00:00Z", posts_count: 8, followers_count: 6 } }, { provider: "github", value: "SafetyAdrien" }, { provider: "reddit", value: "adrien_sama63" }, { provider: "twitch", value: "adrien_sama" }],
    });
    qc.setQueryData(["mutual-friends", "u1", "u2"], [
      { id: "m1", username: "pearl", display_name: "Pearl", avatar_url: art("#a55", "P"), status: "online", custom_status: null },
      { id: "m2", username: "pikatsudo", display_name: "PikatSudo", avatar_url: art("#555", "K"), status: "online", custom_status: "Linux Forever" },
      { id: "m3", username: "florian", display_name: "Florian", avatar_url: art("#d92", "F"), status: "offline", custom_status: null },
    ]);
    qc.setQueryData(["mutual-servers", "u1", "u2"], [
      { id: "s1", name: "ADRIEN's HOUSE", icon_url: art("#3a3fa8", "A"), nickname: null },
      { id: "s2", name: "Aide Réseaux", icon_url: art("#5a49d6", "R"), nickname: "Adrien" },
      { id: "s3", name: "Space Group", icon_url: art("#2f7de0", "S"), nickname: null },
    ]);
    const fr = (id: string, p: ReturnType<typeof mk>, status: string, incoming: boolean) => ({ id: "fs" + id, status, created_at: null, user_id: incoming ? p.id : "u1", friend_id: incoming ? "u1" : p.id, profile: p, isIncoming: incoming });
    const list = m === "add" ? [] : [
      fr("1", mk("u2", "Adrien_Sama", "adrien_sama", "online", "I'am Adrien_Sama"), m === "blocked" ? "blocked" : "accepted", false),
      fr("2", mk("u3", "Azerius", "azerius", "idle", "Watching YouTube"), "accepted", false),
      fr("3", mk("u4", "Blob", "blob_rooster", "online", null), "pending", true),
      fr("4", mk("u5", "Astro1112", "astro1112", "offline", null), "pending", false),
    ];
    qc.setQueryData(["friends", "u1"], list);
    qc.setQueryData(["dm-conversations", "u1"], [
      { id: "d1", name: null, icon_url: null, is_group: false, created_at: null, participants: [{ id: "u2", username: "adrien_sama", display_name: "Adrien_Sama", avatar_url: null, status: "dnd", custom_status: "I'am Adrien_Sama" }] },
      { id: "d2", name: null, icon_url: null, is_group: false, created_at: null, participants: [{ id: "u3", username: "azerius", display_name: "Azerius", avatar_url: null, status: "idle", custom_status: "Watching YouTube" }] },
      { id: "d3", name: null, icon_url: null, is_group: false, created_at: null, participants: [{ id: "u6", username: "arkosse", display_name: "Arkosse", avatar_url: null, status: "offline" }] },
    ]);
    const SID = "11111111-1111-4111-8111-111111111111";
    for (const k of ["picker-servers", "picker-emojis", "picker-stickers"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    qc.setQueryData(["picker-servers", "u1"], [{ id: SID, name: "ADRIEN's HOUSE", icon_url: art("#3a3fa8", "A"), is_public: false }]);
    qc.setQueryData(["picker-emojis", SID], [
      { id: "e1", name: "ALogo", url: `https://x.supabase.co/storage/v1/object/public/server-emojis/${SID}/1-aaa-ALogo.svg`, server_id: SID, created_at: null },
      { id: "e2", name: "Globe", url: `https://x.supabase.co/storage/v1/object/public/server-emojis/${SID}/2-bbb-Globe.svg`, server_id: SID, created_at: null },
    ]);
    qc.setQueryData(["dm-messages", "u1", "d1"], [
      { id: "x1", content: "Coucou ! <:ALogo:" + SID + "/1-aaa-ALogo.svg> et <:Globe:" + SID + "/2-bbb-Globe.svg> ok", created_at: new Date().toISOString(), edited_at: null, attachments: [], conversation_id: "d1", reply_to_id: null, author: { id: "u2", username: "adrien_sama", display_name: "Adrien_Sama", avatar_url: null } },
      { id: "x2", content: "<:ALogo:" + SID + "/1-aaa-ALogo.svg>", created_at: new Date().toISOString(), edited_at: null, attachments: [], conversation_id: "d1", reply_to_id: null, author: { id: "u1", username: "me", display_name: "Moi", avatar_url: null } },
    ]);
    qc.setQueryDefaults(["dm-reactions"], { staleTime: Infinity });
    qc.setQueryData(["dm-reactions", "x1,x2"], { x2: [
      { id: "r1", message_id: "x2", user_id: "u1", emoji: "<:ALogo:" + SID + "/1-aaa-ALogo.svg>", created_at: null },
      { id: "r2", message_id: "x2", user_id: "u2", emoji: ":Globe:", created_at: null },
      { id: "r3", message_id: "x2", user_id: "u2", emoji: "⭐", created_at: null },
    ] });
    if (m.startsWith("call")) {
      const mkCall = (over: object) => ({ id: "c1", conversation_id: "d1", initiator_id: "u2", status: "ringing", call_type: "voice", started_at: null, ended_at: null, created_at: new Date(Date.now() - 60000).toISOString(), initiator: { id: "u2", username: "adrien_sama", display_name: "Adrien_Sama", avatar_url: art("#4b3fc9", "A") }, ...over });
      const c = m === "callme" ? mkCall({ initiator_id: "u1", initiator: { id: "u1", username: "me", display_name: "Moi", avatar_url: null }, status: "active", started_at: new Date().toISOString() }) : mkCall({});
      qc.setQueryDefaults(["dm-call"], { staleTime: Infinity });
      qc.setQueryDefaults(["dm-call-history"], { staleTime: Infinity });
      qc.setQueryDefaults(["dm-calls-all"], { staleTime: Infinity });
      qc.setQueryData(["dm-call", "d1"], c);
      qc.setQueryData(["dm-call-history", "d1"], [mkCall({ id: "c0", status: "ended", started_at: new Date(Date.now() - 3600000).toISOString(), ended_at: new Date(Date.now() - 3480000).toISOString(), created_at: new Date(Date.now() - 3600000).toISOString() }), c]);
      qc.setQueryData(["dm-calls-all", "u1"], [c]);
      if (m === "callme") joinCallSession("c1", "d1", "Adrien_Sama");
    }
    if (getUserSettings().dms.pinned.length === 0) patchUserSettings({ dms: { pinned: ["d2"], hidden: [], hide_blocked_banner: false } });
    return null;
  });
  const conv = m === "conv" || m === "stranger" || m === "blocked" || m === "nick" || m.startsWith("call");
  if (m === "convonly") return (<AuthContextOverride value={auth as AuthContextType}><HarnessBoundary><Suspense fallback={<div className="p-6 text-white">suspense…</div>}><div className="h-[100svh] flex"><DMConversation conversationId="d1" /></div></Suspense></HarnessBoundary></AuthContextOverride>);
  return (
    <AuthContextOverride value={auth as AuthContextType}>
      <HarnessBoundary><div className="h-[100svh] flex bg-[hsl(var(--sidebar-background))]">
        <div className="w-[72px]" />
        <div className="flex-1 flex border-l border-t border-[hsl(var(--frame-border))] rounded-tl-[12px] mt-[5px] overflow-hidden">
          <DMSidebar activeDMId={conv ? "d1" : null} currentView={conv ? "conversation" : "friends"} onConversationSelect={NOOP} onShowFriends={NOOP} onShowInbox={NOOP} />
          <DMPage activeDMId={conv ? "d1" : null} currentView={conv ? "conversation" : "friends"} onConversationSelect={NOOP} onShowFriends={NOOP} />
        </div>
      </div></HarnessBoundary>
    </AuthContextOverride>
  );
}

/* Favoris : ?view=favorites&m=list|empty (donnees seedees) */
function FavoritesHarnessView({ m }: { m: string }) {
  const qc = useQueryClient();
  const auth = useMemo(() => ({ ...fakeAuth, user: { id: "u1" } }), []);
  useState(() => {
    const art = (c: string, t: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="40" fill="${c}"/><text x="40" y="52" fill="#fff" font-size="30" text-anchor="middle">${t}</text></svg>`);
    for (const k of ["picker-servers", "all-channels", "dm-conversations"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    qc.setQueryData(["picker-servers", "u1"], [{ id: "s1", name: "Testing Features", icon_url: null }, { id: "s2", name: "Aide Réseaux", icon_url: art("#3b4cc0", "A") }, { id: "s3", name: "Archives Previews", icon_url: art("#223", "P") }]);
    qc.setQueryData(["all-channels", "s1,s2,s3"], [
      { id: "c1", name: "général", type: "text", server_id: "s1" },
      { id: "c2", name: "🔗 • avis", type: "text", server_id: "s2" },
      { id: "c3", name: "Général", type: "voice", server_id: "s1" },
      { id: "c4", name: "welcome", type: "text", server_id: "s3" },
      { id: "c5", name: "blog", type: "announcement", server_id: "s3" },
    ]);
    qc.setQueryData(["dm-conversations", "u1"], [
      { id: "d1", name: null, icon_url: null, is_group: false, created_at: null, participants: [{ id: "u2", username: "adrien_sama", display_name: "Adrien_Sama", avatar_url: art("#3344aa", "A"), status: "dnd" }] },
      { id: "d2", name: null, icon_url: null, is_group: false, created_at: null, participants: [{ id: "u3", username: "unegirlsolo", display_name: "Alexia ❤", avatar_url: art("#885533", "L"), status: "offline" }] },
    ]);
    if (m !== "empty") {
      patchUserSettings({ favorites: { categories: [{ id: "k1", name: "Salons" }], items: [
        { id: "f1", kind: "thread", ref_id: "t1", server_id: "s1", channel_id: "c1", name: "Coucou", nickname: null, sub: "Testing Features", icon_url: null, ch_type: null, category_id: null },
        { id: "f2", kind: "thread", ref_id: "t2", server_id: "s1", channel_id: "c1", name: "Hehe", nickname: null, sub: "Testing Features", icon_url: null, ch_type: null, category_id: "k1" },
        { id: "f3", kind: "dm", ref_id: "d9", server_id: null, channel_id: null, name: "Archives Mail", nickname: null, sub: "Archives Mail#8068", icon_url: art("#2a6", "M"), ch_type: null, category_id: "k1" },
      ] } });
    } else {
      patchUserSettings({ favorites: { categories: [{ id: "k1", name: "Salons" }], items: [] } });
    }
    return null;
  });
  return (
    <AuthContextOverride value={auth as AuthContextType}>
      <div className="h-[100svh] flex bg-[hsl(var(--sidebar-background))]">
        <div className="w-[72px]" />
        <div className="flex-1 flex border-l border-t border-[hsl(var(--frame-border))] rounded-tl-[12px] mt-[5px]">
          <FavoritesSidebar activeKey={m === "list" ? "thread:t1" : null} onOpen={NOOP} onGoToServer={NOOP} />
          <div className="flex-1 flex bg-background">{m === "empty" ? <FavoritesEmpty /> : null}</div>
        </div>
      </div>
    </AuthContextOverride>
  );
}

/* Carte du panneau utilisateur : ?view=usercard */
function UserCardHarnessView() {
  const qc = useQueryClient();
  useState(() => {
    qc.setQueryDefaults(["user-server-tag"], { staleTime: Infinity });
    qc.setQueryData(["user-server-tag", "u1"], { userId: "u1", serverId: "s1", name: "RGV", badgeId: "flame", color: null });
    qc.setQueryDefaults(["user-voice-activity"], { staleTime: Infinity });
    qc.setQueryData(["user-voice-activity", "u1", null], { channelId: "c1", channelName: "Général", serverId: "s1", serverName: "Testing Features", voiceStatus: null });
    return null;
  });
  const auth = useMemo(
    () => ({ ...fakeAuth, profile: { ...fakeAuth.profile, status: "online", bio: "Quoi ? Lis mon pseudo !", pronouns: "Il/He", custom_status: "😆 Latest hobby", theme_color: "#0b9be3", avatar_url: null, banner_url: null } }),
    [],
  );
  return (
    <AuthContextOverride value={auth as AuthContextType}>
      <div className="h-[100svh] bg-background" />
      <div className="fixed bottom-2 left-2 w-[320px] rounded-lg bg-[hsl(var(--user-panel))]">
        <UserProfileCard onOpenSettings={NOOP} onOpenProfile={NOOP} />
      </div>
    </AuthContextOverride>
  );
}

/* Rappels : ?view=reminders (menu d'un message + boite de reception, donnees seedees) */
function RemindersHarnessView() {
  const qc = useQueryClient();
  const auth = useMemo(() => ({ ...fakeAuth, user: { id: "u1" } }), []);
  useState(() => {
    qc.setQueryDefaults(["message-reminders"], { staleTime: Infinity });
    const snap = { authorId: "u1", authorName: "Adrien", authorAvatar: null, content: "Test fil créé.", createdAt: new Date().toISOString(), channelName: "général", serverName: "Testing Features", categoryName: "Salons textuels", serverIcon: null };
    qc.setQueryData(["message-reminders", "u1"], [
      { id: "r1", source: "channel", message_id: "m1", channel_id: "c1", conversation_id: null, server_id: "s1", thread_id: null, remind_at: new Date(Date.now() + 2 * 60000).toISOString(), snapshot: snap, created_at: new Date().toISOString() },
      { id: "r2", source: "channel", message_id: "m2", channel_id: "c1", conversation_id: null, server_id: "s1", thread_id: null, remind_at: new Date(Date.now() - 5 * 60000).toISOString(), snapshot: { ...snap, content: "Message en retard" }, created_at: new Date().toISOString() },
    ]);
    return null;
  });
  return (
    <AuthContextOverride value={auth as AuthContextType}>
      <div className="min-h-[100svh] bg-background p-6 flex gap-6">
        <UniversalMessageContextMenu
          messageId="m9"
          isOwnMessage
          reminder={{ source: "channel", messageId: "m9", channelId: "c1", serverId: "s1", snapshot: { authorName: "Adrien", content: "Un message", createdAt: new Date().toISOString() } }}
          onAddReaction={NOOP}
          onCopyLink={NOOP}
          onCopyId={NOOP}
          onReply={NOOP}
        >
          <div id="msg" className="h-16 w-[300px] rounded bg-white/5 p-3 text-white">Clic droit ici</div>
        </UniversalMessageContextMenu>
        <div className="w-[675px] rounded-lg bg-[hsl(var(--input))] overflow-hidden"><InboxPanel /></div>
        <div className="fixed top-0 right-0 h-[38px] flex bg-[hsl(var(--sidebar-background))]"><InboxButton /></div>
      </div>
    </AuthContextOverride>
  );
}

/* Bloc vocal + fenetre de suppression du bruit : ?view=voicepanel */
function VoicePanelHarnessView() {
  return (
    <AuthContextOverride value={fakeAuth}>
      <div className="h-[100svh] bg-background" />
      <div className="fixed bottom-2 left-2 w-[400px]">
        <VoiceStatusBadge channelName="Général" serverName="Testing Features" onDisconnect={NOOP} />
      </div>
    </AuthContextOverride>
  );
}

/* Editeur de profil : ?view=profileeditor */
function ProfileEditorHarnessView({ dirty }: { dirty: boolean }) {
  const qc = useQueryClient();
  useState(() => {
    for (const k of ["my-server-tags", "user-server-tag", "server-tag-card"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    const mk = (id: string, name: string, tag: string, badge: string, color: string | null) => ({ id: `t-${id}`, server_id: id, name: tag, badge_id: badge, color, enabled: true, version: 1, updated_at: "", server_name: name, server_icon: null, server_description: null, server_is_public: true });
    qc.setQueryData(["my-server-tags", "u1"], [mk("s1", "RGV Aerial Photography", "RGV", "flame", null), mk("s2", "Everwind", "WIND", "bolt", null), mk("s3", "Avid Space", "AVID", "planet", null), mk("s4", "Photography Lounge", "JPG", "gem", null)]);
    qc.setQueryData(["user-server-tag", "u1"], null);
    return null;
  });
  const auth = useMemo(
    () => ({ ...fakeAuth, profile: { ...fakeAuth.profile, status: "online", bio: dirty ? "Quoi ? Lis mon pseudo !" : "Quoi ? Lis mon pseudo !", pronouns: null, created_at: "2024-01-11T10:00:00Z", custom_status: "😆 Latest hobby", theme_color: "#0b9be3" } }),
    [dirty],
  );
  return (
    <AuthContextOverride value={auth as AuthContextType}>
      <div className="h-[100svh] bg-background" />
      <ProfileEditor />
    </AuthContextOverride>
  );
}

/* "Définir ton statut" : ?view=customstatus&s=<texte deja enregistre> */
function CustomStatusHarnessView({ status }: { status: string }) {
  const auth = useMemo(() => ({ ...fakeAuth, profile: { ...fakeAuth.profile, status: "idle", custom_status: status || null, pronouns: "Il/He" } }), [status]);
  return (
    <AuthContextOverride value={auth as AuthContextType}>
      <div className="h-[100svh] bg-background" />
      <CustomStatusModal open onOpenChange={NOOP} />
    </AuthContextOverride>
  );
}

const DEMO_IMAGES = (n: number) => Array.from({ length: n }, (_, i) => ({
  id: `img${i}`, name: `i${i}.png`, type: "image" as const, size: 1, isSpoiler: i === 0,
  url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='hsl(${i * 55},35%,32%)'/><text x='200' y='160' font-size='60' fill='white' text-anchor='middle'>${i + 1}</text></svg>`)}`,
}));

const FORWARD_DEMO: ForwardPayload = {
  content: "Test fil créé & modifié.",
  edited: true,
  attachments: Array.from({ length: 6 }, (_, i) => ({ id: `a${i}`, url: "/placeholder.svg", name: `i${i}.png`, type: "image" as const, size: 1 })),
  from: { kind: "channel", messageId: "m1", createdAt: new Date(2026, 9, 30, 11, 34).toISOString(), channelId: "ch1", channelName: "général", serverId: "s1" },
};

/* Messages : ?view=messages&m=toolbar|shift|ctx|ctxpoll|forward|forwarded */
function MessagesHarnessView({ m }: { m: string }) {
  const qc = useQueryClient();
  const NOOP2 = () => {};
  const mkCh = (id: string, name: string, type: string) => ({ id, name, type, description: null, position: 0, icon_url: null });
  useState(() => {
    for (const k of ["servers", "dm-conversations", "forward-threads", "forward-channel-perms"]) qc.setQueryDefaults([k], { staleTime: Infinity });
    qc.setQueryData(["servers"], [
      { id: "s1", name: "Testing Features", icon_url: null, banner_url: null, description: null, is_public: false, owner_id: "u1", secondary_owner_id: null, created_at: null, categories: [{ id: "c1", name: "Salons textuels", position: 0, channels: [mkCh("ch1", "général", "text"), mkCh("ch2", "annonce", "announcement"), mkCh("ch3", "tchat", "text")] }], orphanChannels: [mkCh("ch4", "Général", "voice")] },
      { id: "s2", name: "Archives Previews", icon_url: null, banner_url: null, description: null, is_public: false, owner_id: "x", secondary_owner_id: null, created_at: null, categories: [{ id: "c2", name: "Salons", position: 0, channels: [mkCh("ch5", "blog", "text"), mkCh("ch6", "town-hall", "text"), mkCh("ch7", "config", "text")] }], orphanChannels: [] },
    ]);
    qc.setQueryData(["dm-conversations", "u1"], [{ id: "d1", name: null, icon_url: null, is_group: false, created_at: null, participants: [{ id: "u1", username: "adrien_moulin", display_name: "Adrien", avatar_url: null, status: "online" }, { id: "u9", username: "adrien_sama", display_name: "Adrien_Sama", avatar_url: null, status: "online" }] }]);
    qc.setQueryData(["forward-threads", "u1"], [{ id: "th1", name: "Test Fil créé", channel_id: "ch1", last_message_at: new Date(2026, 9, 30, 11, 34).toISOString(), archived: false }]);
    return null;
  });
  const row = (own: boolean, text: string, extra?: React.ReactNode) => (
    <UniversalMessageContextMenu
      messageId="m1" isOwnMessage={own} onReply={NOOP2} onAddReaction={NOOP2} onCopyText={NOOP2} onCopyLink={NOOP2} onCopyId={NOOP2}
      onEdit={own ? NOOP2 : undefined} onDelete={NOOP2} onPin={NOOP2} onForward={NOOP2} onMarkUnread={NOOP2}
      onCreateThread={m === "ctxpoll" || !own ? NOOP2 : undefined} canManageMessages variant={m === "ctxpoll" ? "poll" : "message"}
      reminder={{ source: "channel", messageId: "m1", channelId: "ch1", serverId: "s1", snapshot: { authorId: "u1", authorName: "Adrien", authorAvatar: null, content: text, createdAt: new Date().toISOString(), channelName: "général" } }}
    >
      <div data-testid="row" className="group/message message-hover relative -mx-4 px-4 pt-2 pb-1 flex gap-3">
        <UniversalMessageActions isVisible isShiftPressed={m === "shift"} isOwnMessage={own} onReply={NOOP2} onAddReaction={NOOP2} onCopyLink={NOOP2} onCopyId={NOOP2} onCopyText={NOOP2} onEdit={own ? NOOP2 : undefined} onDelete={NOOP2} onPin={NOOP2} onForward={NOOP2} onMarkUnread={NOOP2} onCreateThread={NOOP2} />
        <span className="w-10 h-10 rounded-full bg-[#5865f2] shrink-0" />
        <div className="min-w-0">
          <div className="text-base font-medium text-white">Adrien <span className="text-xs text-[#b5bac1] font-normal">11:34</span></div>
          {extra ?? <div className="text-base text-white">{text}</div>}
        </div>
      </div>
    </UniversalMessageContextMenu>
  );
  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-[100svh] bg-background pt-24 px-10">
        <div className="w-[880px]">
          {m === "mosaic" ? <div className="space-y-8">{[2, 3, 4, 5, 6, 8].map((n) => <MessageAttachments key={n} attachments={DEMO_IMAGES(n).map((a) => ({ ...a, isSpoiler: false }))} authorId="u1" />)}</div> : m === "forwarded" ? row(true, "x", (
            <ForwardedFrame from={{ kind: "channel", messageId: "m1", createdAt: new Date(2026, 9, 30, 11, 34).toISOString(), channelId: "ch1", channelName: "général" }} onJump={NOOP2}>
              <div className="text-base text-white">Test fil créé & modifié.</div>
              <MessageAttachments attachments={DEMO_IMAGES(6)} authorId="u1" onEditAttachment={NOOP2} onRemoveAttachment={NOOP2} />
            </ForwardedFrame>
          )) : row(m !== "ctxother", "Test fil créé & modifié.")}
        </div>
      </div>
      {m === "forward" && <ForwardMessageDialog payload={FORWARD_DEMO} onClose={NOOP2} />}
    </TooltipProvider>
  );
}

/* Medias : ?view=media&m=modal|replace|edit */
function MediaHarnessView({ m }: { m: string }) {
  const edits = useAttachmentEdits();
  useState(() => { edits.reset([...DEMO_IMAGES(2).map((a) => ({ ...a, isSpoiler: false })), { id: "au1", name: "morceau.mp3", type: "audio" as const, size: 3_400_000, url: "" }]); return null; });
  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-[100svh] bg-background p-10">
        {m === "edit" && <div className="w-[640px] rounded-xl bg-[hsl(var(--surface-3))] px-3 py-2.5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Médias du message</p><AttachmentEditsPanel edits={edits} /></div>}
        {m === "audio" && <MessageAttachments attachments={[{ id: "au1", name: "morceau.mp3", type: "audio", size: 3_400_000, url: "" }]} authorId="u1" />}
        {m === "modal" && <MediaUploadModal open onOpenChange={() => {}} targetName="#général" onConfirm={() => {}} />}
        {m === "replace" && <MediaUploadModal open onOpenChange={() => {}} title="Remplacer l'image" targetName="i0.png" allowedKinds={["image"]} maxItems={1} confirmLabel="Remplacer" onConfirm={() => {}} />}
      </div>
    </TooltipProvider>
  );
}

export default function StageHarness({ params }: { params: URLSearchParams }) {
  const view = params.get("view");
  return (
    <AuthContextOverride value={fakeAuth}>
      {view === "stage" && <StageView state={params.get("state") ?? "live"} />}
      {view === "modals" && <ModalsView m={params.get("m") ?? "welcome"} />}
      {view === "checklist" && <ChecklistView />}
      {view === "settings" && <SettingsView tab={params.get("tab") ?? "profile"} />}
      {view === "search" && <SearchView mode={params.get("mode") ?? "menu"} />}
      {view === "events" && <EventsView m={params.get("m") ?? "list"} />}
      {view === "pages" && <PagesView p={params.get("p") ?? "guide"} />}
      {view === "announce" && <AnnounceView m={params.get("m") ?? "chat"} />}
      {view === "folders" && <FoldersView open={params.get("open") === "1"} />}
      {view === "voiceempty" && <div className="h-[100svh] flex"><VoiceEmptyState channelName="Mars" onJoin={NOOP} isConnecting={false} /></div>}
      {view === "voice" && <VoiceHarnessView state={params.get("state") ?? "empty"} chat={params.get("chat") === "1"} />}
      {view === "voicestatus" && <VoiceStatusModal channelName="Général" serverId={null} initial="" onClose={NOOP} onSave={NOOP} />}
      {view === "reminders" && <RemindersHarnessView />}
      {view === "voicepanel" && <VoicePanelHarnessView />}
      {view === "media" && <MediaHarnessView m={params.get("m") ?? "modal"} />}
      {view === "messages" && <MessagesHarnessView m={params.get("m") ?? "toolbar"} />}
      {view === "threads" && <ThreadsHarnessView m={params.get("m") ?? "list"} />}
      {view === "tagpicker" && <TagPickerHarnessView />}
      {view === "usercard" && <UserCardHarnessView />}
      {view === "dms" && <DMsHarnessView m={params.get("m") ?? "friends"} />}
      {view === "favorites" && <FavoritesHarnessView m={params.get("m") ?? "list"} />}
      {view === "profileeditor" && <ProfileEditorHarnessView dirty={params.get("dirty") === "1"} />}
      {view === "customstatus" && <CustomStatusHarnessView status={params.get("s") ?? ""} />}
      {view === "picker" && <PickerHarnessView tab={(params.get("tab") ?? "emoji") as "emoji" | "sticker" | "gif"} />}
      {view === "tagmodal" && <TagModalHarnessView />}
      {view === "discover" && <DiscoverHarnessView section={params.get("section") ?? "servers"} tab={params.get("tab") ?? "home"} app={params.get("app") === "1"} preview={params.get("preview") === "1"} empty={params.get("empty") === "1"} />}
      {view === "inbox" && <InboxHarnessView tab={params.get("tab") ?? "unread"} />}
      {view === "forum" && <ForumHarnessView mode={params.get("mode") === "media" ? "media" : "forum"} m={params.get("m") ?? "gallery"} />}
      {view === "usersettings" && <UserSettingsView page={params.get("page") ?? "account"} />}
    </AuthContextOverride>
  );
}
