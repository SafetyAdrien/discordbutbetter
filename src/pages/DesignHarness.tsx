/**
 * Harnais de design — route /design, hors authentification.
 *
 * Rend les composants de structure avec des données fictives afin de
 * vérifier visuellement le restyle sans passer par Supabase, et de
 * photographier un état stable pour comparaison avant/après.
 *
 * Ne pas importer depuis le reste de l'app : ce fichier existe uniquement
 * pour la vérification visuelle.
 */
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ServerList } from "@/components/layout/ServerList";
import { ChannelList } from "@/components/layout/ChannelList";
import { MemberList } from "@/components/layout/MemberList";
import { ChatArea } from "@/components/chat/ChatArea";
import { DMPage, DMSidebar } from "@/components/dm/DMPage";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import StageHarness from "./design/StageHarness";
import { ServerSettingsIcon, type ServerSettingsIconName } from "@/components/icons/ServerSettingsIcon";
import { VoiceContextOverride, defaultVoiceContext } from "@/contexts/VoiceContext";
import ICON_SOURCE from "@/components/icons/ServerSettingsIcon?raw";
import {
  ACTIVE_CHANNEL,
  ACTIVE_CHANNEL_ID,
  MEMBERS,
  MESSAGES,
  OWNER_ID,
  SERVERS,
  SERVER,
  U_ADRIEN,
} from "@/design/fixtures";

const NOOP = () => {};

const stickerArt = (c: string, t: string) => "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" rx="10" fill="${c}"/><text x="40" y="52" fill="#fff" font-size="30" text-anchor="middle">${t}</text></svg>`);

const demoImg = (i: number) => ({
  id: `vi${i}`, name: `capture-${i}.png`, type: "image" as const, size: 1, isSpoiler: i === 0,
  url: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'><rect width='400' height='300' fill='hsl(${220 + i * 12},12%,${22 + i * 2}%)'/></svg>`)}`,
});
const VIDEO_MESSAGES = [
  { id: "v1", content: "Test fil créé & modifié.", author: U_ADRIEN, timestamp: new Date(Date.now() - 6 * 3600_000), edited_at: new Date().toISOString(), created_at: new Date(Date.now() - 6 * 3600_000).toISOString(), attachments: [0, 1, 2, 3, 4, 5].map(demoImg) },
  { id: "v2", content: "[SYSTEM:POLL_CLOSED:p1]", is_system: true, author: U_ADRIEN, timestamp: new Date(Date.now() - 3600_000) },
  { id: "v4", content: "[SYSTEM:THREAD_CREATED:th9:Test Thread]", is_system: true, author: U_ADRIEN, timestamp: new Date(Date.now() - 60_000), created_at: new Date(Date.now() - 60_000).toISOString() },
  { id: "v3", content: "", author: U_ADRIEN, timestamp: new Date(), created_at: new Date().toISOString(), attachments: [{ id: "st1", name: "Simon mode Vampire", type: "sticker" as const, size: 0, url: stickerArt("#a33", "V") }] },
] as unknown as typeof MESSAGES;

/* Images volontairement cassees (?broken=1) pour verifier les replis :
   initiales de serveur, en-tete sans banniere. */
const BROKEN_IMG = "https://invalid.example/missing.png";

export default function DesignHarness() {
  const [channelId, setChannelId] = useState<string | null>(ACTIVE_CHANNEL_ID);
  const queryClient = useQueryClient();
  // Carte d'invitation de l'app (pas de Supabase ici) : apercu pre-rempli.
  useMemo(() => {
    queryClient.setQueryData(["invite-preview", "app", "design"], {
      source: "app", code: "design", serverId: SERVER.id, name: SERVER.name,
      iconUrl: null, bannerUrl: null, description: "Serveur de démonstration du harnais de design.",
      memberCount: MEMBERS.length, onlineCount: MEMBERS.filter((m) => m.status !== "offline").length,
      createdAt: new Date("2025-03-01"), community: true, boostTier: 0, tag: null, game: null, traits: [], unusable: false,
    });
  }, [queryClient]);
  // ?community=1 : serveur de communaute (badge de l'en-tete).
  useMemo(() => {
    if (new URLSearchParams(window.location.search).get("community") !== "1") return;
    queryClient.setQueryDefaults(["server-settings"], { staleTime: Infinity });
    queryClient.setQueryData(["server-settings", SERVER.id], { id: "ss", server_id: SERVER.id, community_enabled: true, profile_traits: [] });
  }, [queryClient]);
  const memberRoles = useMemo(() => new Map(MEMBERS.map((m) => [m.id, m.roles])), []);
  const params = new URLSearchParams(window.location.search);
  const home = params.get("view") === "home";
  const subView = params.get("view");
  if (subView === "stage" || subView === "modals" || subView === "checklist" || subView === "settings" || subView === "search" || subView === "events" || subView === "pages" || subView === "usersettings" || subView === "announce" || subView === "forum" || subView === "tagmodal" || subView === "discover" || subView === "inbox" || subView === "folders" || subView === "voiceempty" || subView === "voice" || subView === "voicestatus" || subView === "picker" || subView === "customstatus" || subView === "profileeditor" || subView === "usercard" || subView === "favorites" || subView === "dms" || subView === "tagpicker" || subView === "voicepanel" || subView === "reminders" || subView === "threads" || subView === "messages" || subView === "media") {
    return <StageHarness params={params} />;
  }
  if (subView === "icons") {
    const names = [...ICON_SOURCE.matchAll(/^ {2}"([a-z-]+)":/gm)].map((m) => m[1] as ServerSettingsIconName);
    return (
      <div className="min-h-[100svh] bg-background p-6 grid grid-cols-9 gap-4 text-muted-foreground">
        {names.map((n) => (
          <div key={n} className="flex flex-col items-center gap-1">
            <ServerSettingsIcon name={n} size={60} />
            <span className="text-[10px]">{n}</span>
          </div>
        ))}
      </div>
    );
  }
  const broken = params.get("broken") === "1";
  const servers = broken ? SERVERS.map((s) => ({ ...s, icon: BROKEN_IMG })) : SERVERS;
  const base0 = broken ? { ...SERVER, bannerUrl: BROKEN_IMG } : SERVER;
  // ?many=1 : serveur charge (x6 les categories) pour mesurer le defilement.
  const base = params.get("many") ? { ...base0, categories: Array.from({ length: 6 }, (_, k) => base0.categories.map((c) => ({ ...c, id: `${c.id}-${k}`, name: `${c.name} ${k + 1}`, channels: c.channels.map((ch) => ({ ...ch, id: `${ch.id}-${k}` })) }))).flat() } : base0;
  const server = broken ? base0 : params.get("banner") ? { ...base, bannerUrl: `data:image/svg+xml;utf8,${encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='560' height='260'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#3b4cc0'/><stop offset='1' stop-color='#8e44ad'/></linearGradient></defs><rect width='560' height='260' fill='url(#g)'/><text x='280' y='150' font-size='40' fill='white' text-anchor='middle' font-family='sans-serif'>AIDE RESEAUX</text></svg>")}` } : SERVER;

  // Copie de la structure d'Index.tsx : rail, puis panneau borde a coin
  // arrondi, panneau utilisateur flottant au-dessus du rail et des salons.
  // `?empty=1` : salon sans messages, pour comparer avec la capture.
  const empty = params.get("empty") === "1";
  // ?chat=video : messages de la video de reference (message avec images + fil, sondage clos, message systeme).
  const chatVideo = params.get("chat") === "video";
  if (chatVideo) {
    for (const k of ["polls", "threads"]) queryClient.setQueryDefaults([k], { staleTime: Infinity });
    const past = new Date(Date.now() - 3600_000).toISOString();
    queryClient.setQueryData(["polls", "channel", ACTIVE_CHANNEL_ID], [{
      id: "p1", channel_id: ACTIVE_CHANNEL_ID, thread_id: null, author_id: "u1", question: "Question", allow_multiple: true, expires_at: past, closed_notified: true,
      created_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
      author: { id: "u1", display_name: "Adrien", avatar_url: null, username: "adrien" },
      options: [{ id: "o1", poll_id: "p1", text: "Choix 1", emoji: null, position: 0 }, { id: "o2", poll_id: "p1", text: "Choix 2", emoji: "🙂", position: 1 }],
      votes: [],
    }]);
    queryClient.setQueryData(["threads", ACTIVE_CHANNEL_ID], [{
      id: "th1", channel_id: ACTIVE_CHANNEL_ID, name: "Test Fil créé", created_by: "u1", message_id: "v1", created_at: new Date(Date.now() - 6 * 3600_000).toISOString(), archived: false, archived_at: null,
      last_message_at: new Date(Date.now() - 6 * 3600_000).toISOString(), message_count: 3, creator: { id: "u1", username: "adrien", display_name: "Adrien", avatar_url: null },
      last_message: { content: "Test envoi.", created_at: new Date(Date.now() - 6 * 3600_000).toISOString(), author: { id: "u1", username: "adrien", display_name: "Adrien", avatar_url: null } },
    }, {
      id: "th9", channel_id: ACTIVE_CHANNEL_ID, name: "Test Thread", created_by: "u1", message_id: null, created_at: new Date(Date.now() - 60_000).toISOString(), archived: false, archived_at: null,
      last_message_at: new Date(Date.now() - 60_000).toISOString(), message_count: 1, creator: { id: "u1", username: "adrien", display_name: "Adrien", avatar_url: null },
      last_message: { content: "Premier Message", created_at: new Date(Date.now() - 60_000).toISOString(), author: { id: "u1", username: "adrien", display_name: "Adrien", avatar_url: null } },
    }]);
  }
  // ?voiceconn=1 : connecte au salon vocal ch-8 avec un participant (liste des salons).
  const voiceConn = params.get("voiceconn") === "1";
  if (voiceConn) {
    queryClient.setQueryDefaults(["voice-participants"], { staleTime: Infinity });
    queryClient.setQueryData(["voice-participants", "ch-8"], [
      { id: "p1", user_id: "u1", channel_id: "ch-8", muted: false, deafened: false, camera: false, streaming: false, joined_at: new Date().toISOString(), profile: { id: "u1", username: "adrien", display_name: "Adrien", avatar_url: null } },
    ]);
  }
  // ?tag=1 : tous les membres affichent le tag SPCE (planete, #2880FB) ; fiche du serveur seedee pour le clic.
  if (params.get("tag") === "1") {
    queryClient.setQueryDefaults(["user-server-tag"], { staleTime: Infinity });
    queryClient.setQueryDefaults(["server-tag-card"], { staleTime: Infinity });
    const tag = { serverId: SERVER.id, name: "SPCE", badgeId: "planet", color: "#2880FB" };
    for (const m of MEMBERS) queryClient.setQueryData(["user-server-tag", m.id], { ...tag, userId: m.id });
    queryClient.setQueryData(["user-server-tag", "u1"], { ...tag, userId: "u1" });
    queryClient.setQueryData(["server-tag-card", SERVER.id], { id: SERVER.id, name: SERVER.name, icon_url: null, description: "Un serveur de test pour les tags : on parle d'espace, de fusées et de planètes.", is_public: true, memberCount: 3 });
  }
  // ?stickers=1 : autocollants de deux serveurs (liste de /sticker, fiche d'un autocollant de message).
  if (params.get("stickers") === "1") {
    queryClient.setQueryDefaults(["picker-servers"], { staleTime: Infinity });
    queryClient.setQueryData(["picker-servers", undefined], [{ id: "sA", name: "Aide Réseaux", icon_url: null }, { id: "sB", name: "Cheerful Choco", icon_url: null }]);
    queryClient.setQueryData(["picker-stickers", "sA,sB"], [
      { id: "1", name: "Simon mode Vampire", url: stickerArt("#a33", "V"), server_id: "sA" },
      { id: "2", name: "Sing", url: stickerArt("#3a3", "S"), server_id: "sB" },
      { id: "3", name: "Sigh", url: stickerArt("#aa3", "H"), server_id: "sB" },
    ]);
    queryClient.setQueryData(["picker-emojis", "sA,sB"], []);
    queryClient.setQueryData(["sticker-origin", "sA"], { isPublic: true, online: 150 });
  }
  const voiceValue = { ...defaultVoiceContext, voiceState: { ...defaultVoiceContext.voiceState, channelId: voiceConn ? "ch-8" : null, channelName: "Salon vocal", serverName: SERVER.name } };
  const body = (

    <div className="h-[100svh] flex bg-[hsl(var(--sidebar-background))] overflow-hidden">
      <ServerList
        servers={servers}
        activeServerId={home ? null : SERVER.id}
        onServerSelect={NOOP}
        onDiscoverClick={NOOP}
        onCreateClick={NOOP}
        reserveUserPanel
      />

      <div className="flex-1 flex min-w-0 min-h-0 mt-[5px] [.desktop-content_&]:mt-0 rounded-tl-[12px] border-l border-t border-[hsl(var(--frame-border))]">
        <div className="relative flex flex-col shrink-0 min-h-0">
          {home ? (
            <DMSidebar
              activeDMId={null}
              currentView="friends"
              onConversationSelect={NOOP}
              onShowFriends={NOOP}
              onShowInbox={NOOP}
            />
          ) : (
            <ChannelList
              server={server}
              activeChannelId={channelId}
              onChannelSelect={setChannelId}
            />
          )}
          <div className="absolute bottom-2 right-1.5 -left-[63px] z-30">
            <div className="w-full rounded-lg overflow-hidden bg-[hsl(var(--user-panel))] border border-white/[0.03] shadow-[0_0_10px_rgba(0,0,0,0.25)]">
              <UserProfileCard onOpenSettings={NOOP} onOpenProfile={NOOP} />
            </div>
          </div>
        </div>

        {home ? (
          <DMPage activeDMId={null} currentView="friends" onConversationSelect={NOOP} onShowFriends={NOOP} />
        ) : (
          <>
            <div className="flex-1 flex flex-col min-w-0">
              <ChatArea
                channel={ACTIVE_CHANNEL}
                messages={empty ? [] : chatVideo ? VIDEO_MESSAGES : MESSAGES}
                memberRoles={memberRoles as never}
                onSendMessage={NOOP}
                showMembers
                members={MEMBERS.map((m) => ({
                  id: m.id,
                  memberId: m.memberId,
                  displayName: m.displayName,
                  username: m.username,
                }))}
              />
            </div>
            {/* Pas de `fillHeight` : l'invariant MemberList.fillHeight
                n'autorise ce prop que sur le montage desktop d'Index.tsx. */}
            <div className="shrink-0 hidden lg:flex flex-col">
              <MemberList members={MEMBERS} ownerId={OWNER_ID} serverId={SERVER.id} className="h-full" />
            </div>
          </>
        )}
      </div>
    </div>
  );
  return voiceConn ? <VoiceContextOverride value={voiceValue}>{body}</VoiceContextOverride> : body;
}