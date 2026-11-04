import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/ui/user-avatar-image";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CustomStatusBubble } from "./CustomStatusBubble";
import { StatusEmoji } from "./StatusEmoji";
import { splitCustomStatus } from "@/lib/customStatus";
import { useClearCustomStatus } from '@/hooks/useClearCustomStatus';
import { useAuth } from "@/contexts/AuthContext";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { Volume2, IdCard, Pencil, ChevronRight, ChevronDown, ChevronUp, Smile, Gamepad2, Headphones, HeadphoneOff, Eye, Trophy, Copy, Settings, Mic, MicOff, Plus } from "@/components/icons/discord/lucide";
import { DiscordMic } from "@/components/icons/DiscordMic";
import { DiscordMicOff } from "@/components/icons/DiscordMicOff";
import { DiscordHeadphones } from "@/components/icons/DiscordHeadphones";
import { DiscordHeadphonesOff } from "@/components/icons/DiscordHeadphonesOff";
import { DiscordSettings } from "@/components/icons/DiscordSettings";
import { useVoice } from "@/contexts/VoiceContext";
import { copyToClipboard } from "@/lib/clipboard";
import { uuidToSnowflake } from "@/lib/snowflake";
import { CustomStatusModal } from "./CustomStatusModal";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { ProfileCardHeader } from "./ProfileCardHeader";
import { ProfileMoreMenu } from "./ProfileMoreMenu";
import { VoiceActivityCard } from "./VoiceActivityCard";
import { UserBadgeList } from "@/components/badges/UserBadgeList";
import { Medal, UserRound, BellOff } from "lucide-react";
import { STATUS_DURATIONS, rememberStatusExpiry, useStatusExpiry } from "@/hooks/useStatusExpiry";
import { MicrophoneSettingsPopover } from "@/components/channels/voice/MicrophoneSettingsPopover";
import { HeadphonesSettingsPopover } from "@/components/channels/voice/HeadphonesSettingsPopover";

const statusColors = {
  online: "bg-[hsl(var(--online))]",
  idle: "bg-[hsl(var(--idle))]",
  dnd: "bg-[hsl(var(--dnd))]",
  offline: "bg-[hsl(var(--offline))]",
};

const panelRow = "w-full h-[58px] px-4 flex items-center gap-3 text-[15px] font-medium text-white hover:bg-white/[0.04] transition-colors";
/* Separateur en retrait de 16px, comme la reference (pas pleine largeur). */
const rowDivider = "relative after:absolute after:left-4 after:right-4 after:bottom-0 after:h-px after:bg-[#47474f] last:after:hidden";
const groupCls = "mx-5 rounded-lg bg-[#3e3e48] overflow-visible";

const STATUS_CHOICES: { status: "online" | "idle" | "dnd" | "offline"; label: string; hint?: string; timed: boolean }[] = [
  { status: "online", label: "En ligne", timed: false },
  { status: "idle", label: "Inactif", timed: true },
  { status: "dnd", label: "Ne pas déranger", hint: "Tu ne recevras pas de notifications sur le bureau", timed: true },
  { status: "offline", label: "Invisible", hint: "Tu apparaîtras hors ligne", timed: true },
];

const statusLabels = {
  online: "En ligne",
  idle: "Inactif",
  dnd: "Ne pas déranger",
  offline: "Hors ligne",
};

const activityIcons: Record<string, React.ElementType> = {
  playing: Gamepad2,
  listening: Headphones,
  watching: Eye,
  competing: Trophy,
};

const activityLabels: Record<string, string> = {
  playing: "Joue à",
  listening: "Écoute",
  watching: "Regarde",
  competing: "En compétition sur",
};

interface UserProfileCardProps {
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  speakingUsers?: Set<string>;
  connectedToVoice?: boolean;
  /** Dans un appel de MP : "Dans un appel" avec le telephone vert. */
  inDMCall?: boolean;
}

export function UserProfileCard({ onOpenSettings, onOpenProfile, speakingUsers, connectedToVoice, inDMCall }: UserProfileCardProps) {
  const { profile } = useAuth();
  const { setManualStatus } = usePresenceContext();
  const voiceCtx = useVoice();
  useStatusExpiry();
  const clearCustomStatus = useClearCustomStatus();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
  const [micPopoverOpen, setMicPopoverOpen] = useState(false);
  const [headphonesPopoverOpen, setHeadphonesPopoverOpen] = useState(false);
  const statusButtonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const closeTimeoutRef = useRef<NodeJS.Timeout>();

  const currentStatus = profile?.status || "offline";

  const startCloseTimer = useCallback(() => {
    closeTimeoutRef.current = setTimeout(() => setShowStatusMenu(false), 150);
  }, []);

  const cancelCloseTimer = useCallback(() => {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }, []);

  useEffect(() => {
    return () => { if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current); };
  }, []);

  // Get activity icon if present
  const ActivityIcon = profile?.activity_type
    ? activityIcons[profile.activity_type as keyof typeof activityIcons]
    : null;

  // Display text: activity > custom status > status label
  const getDisplayText = () => {
    if (profile?.activity_type && profile?.activity_text && ActivityIcon) {
      return (
        <span className="flex items-center gap-1 text-sm text-muted-foreground truncate">
          <ActivityIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="truncate">
            {activityLabels[profile.activity_type as keyof typeof activityLabels]} {profile.activity_text}
          </span>
        </span>
      );
    }
    if (inDMCall) return <span className="flex items-center gap-1"><svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--online))]" fill="currentColor" aria-hidden><path d="M17.7 13.3a1 1 0 00-1.2-.2l-2 1a12 12 0 01-4.8-4.8l1-2a1 1 0 00-.2-1.2L8.6 3.6a1 1 0 00-1.3-.1L4.8 5.3a2 2 0 00-.7 2 18 18 0 0012.4 12.4 2 2 0 002-.7l1.8-2.5a1 1 0 00-.1-1.3l-2.5-1.9z" /></svg>Dans un appel</span>;
    if (profile?.custom_status && currentStatus !== "offline") {
      const { emoji, text } = splitCustomStatus(profile.custom_status);
      return (
        <span className="flex items-center gap-1 truncate">
          {connectedToVoice && <><Volume2 className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--online))]" /><span aria-hidden>•</span></>}
          {emoji && <StatusEmoji emoji={emoji} className="w-4 h-4 text-[13px]" />}
          <span className="truncate">{text}</span>
        </span>
      );
    }
    if (connectedToVoice) return <span className="flex items-center gap-1"><Volume2 className="w-3.5 h-3.5 shrink-0 text-[hsl(var(--online))]" />{statusLabels[currentStatus]}</span>;
    return statusLabels[currentStatus];
  };

  const handleStatusHover = () => {
    if (statusButtonRef.current && popoverRef.current) {
      const buttonRect = statusButtonRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const menuHeight = 160;

      setMenuPosition({
        top: Math.max(10, buttonRect.top - menuHeight / 2 + buttonRect.height / 2),
        left: popoverRect.right + 1,
      });
    }
    setShowStatusMenu(true);
  };

  const handleStatusChange = (status: "online" | "idle" | "dnd" | "offline", ms: number | null) => {
    // Informer le système de présence que c'est un changement manuel ; l'échéance (le cas échéant) rebascule sur "En ligne".
    setManualStatus(status);
    if (profile?.id) rememberStatusExpiry(profile.id, status === "online" ? null : ms);
    setShowStatusMenu(false);
  };

  const isSpeakingSelf = !!(profile?.id && speakingUsers?.has(profile.id));

  return (
    /*
     * Discord user panel.
     *
     * - Same colour token as the composer (`--input`). This was wrong twice
     *   before: first `surface-3`, then `surface-1`. In the reference the panel
     *   is visibly LIGHTER than the channel list above it and reads as one
     *   block with the message composer sitting next to it.
     * - `h-[52px]`. Discord publishes `--custom-app-panels-height:
     *   52.984375px`, i.e. a sub-pixel value that rounds to 53. Using 53 left
     *   the panel 1px taller than the composer row (44px box + 8px gutter =
     *   52px), so the two top edges never met exactly. 52px makes both rows
     *   identical: same top edge, same bottom edge.
     *
     *   The panel still reads taller than the composer box, which is what the
     *   reference shows, because the box floats on an 8px gutter.
     */
    <div
      className={cn(
        // La carte (fond, bordure, ombre, rayon) est posee par Index : ici
        // seulement la rangee de 56px de la capture de reference.
        "w-full shrink-0 h-14 pl-2 pr-1.5 flex items-center gap-1",
      )}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="group/panel flex items-center gap-2 flex-1 min-w-0 h-10 pl-0.5 pr-1 rounded-md hover:bg-[hsl(var(--interactive-background-selected))] transition-colors text-left">
            <div className="relative">
              <div
                className={cn(
                  // No transition: all three speaking rings (this one, the channel-list
                // one, and the big participant card) must light up on the SAME
                // frame. A colour transition here made this ring visibly trail
                // the others by their duration.
                "rounded-full border-2",
                isSpeakingSelf ? "border-[hsl(var(--online))]" : "border-transparent",
                )}
              >
                <UserAvatarImage
                  src={profile?.avatar_url}
                  alt={profile?.display_name}
                  className="w-8 h-8"
                  fallbackClassName="bg-primary/20 text-primary text-sm"
                  fallback={profile?.display_name?.charAt(0).toUpperCase() || '?'}
                />
              </div>

              <StatusIndicator
                status={currentStatus}
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[hsl(var(--user-panel))]"
                bgClassName="bg-[hsl(var(--user-panel))]"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              {/* Discord's panel type scale: display name is `text-md/medium`
                  (16px / 500), status line is `text-sm/medium` (14px). */}
              <p className="text-base font-semibold leading-5 text-foreground truncate">{profile?.display_name || "Chargement..."}</p>
              <div className="relative text-[13px] leading-4 text-[hsl(var(--icon-default))] truncate">
                <div className={cn("truncate", profile?.username && "group-hover/panel:opacity-0")}>{getDisplayText()}</div>
                {profile?.username && (
                  <div className="absolute inset-0 truncate opacity-0 group-hover/panel:opacity-100">{profile.username}</div>
                )}
              </div>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent
          ref={popoverRef}
          align="start"
          side="top"
          sideOffset={8}
          className="w-[360px] p-0 overflow-visible rounded-lg bg-[#383840] border border-white/[0.06] shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
        >
          <ProfileCardHeader
            size="sm"
            isOwn
            user={{
              id: profile?.id ?? '',
              display_name: profile?.display_name ?? '',
              username: profile?.username ?? '',
              avatar_url: profile?.avatar_url ?? null,
              banner_url: profile?.banner_url ?? null,
              bio: profile?.bio ?? null,
              status: currentStatus,
              pronouns: (profile as any)?.pronouns ?? null,
              custom_status: profile?.custom_status ?? null,
            }}
            bannerStyle={{ background: profile?.theme_gradient ? `linear-gradient(135deg, ${profile.theme_gradient.split(',')[0]}, ${profile.theme_gradient.split(',')[1] ?? profile.theme_gradient.split(',')[0]})` : profile?.theme_color || 'hsl(var(--primary))' }}
            className="pb-1"
          >
            {profile?.bio && <p className="mt-3 text-base leading-[22px] text-white line-clamp-3 break-words">{profile.bio}</p>}
          </ProfileCardHeader>

          {profile?.id && (
            <div className="mx-5 mt-3"><VoiceActivityCard user={{ id: profile.id, display_name: profile.display_name ?? '', avatar_url: profile.avatar_url ?? null }} /></div>
          )}

          {/* Groupe 1 : profil, statut, badges */}
          <div className={cn(groupCls, "mt-4")}>
            <button type="button" onClick={onOpenProfile} className={cn(panelRow, rowDivider, "rounded-t-lg")}>
              <Pencil className="w-5 h-5 text-[hsl(var(--icon-default))]" />
              <span className="flex-1 text-left">Modifier le profil</span>
            </button>

            <div className={cn("relative group/status", rowDivider)}>
              <button type="button" className={panelRow} aria-haspopup="menu">
                <StatusIndicator status={currentStatus} className="w-3 h-3 mx-1" bgClassName="bg-[hsl(var(--card))]" />
                <span className="flex items-center gap-2 text-left min-w-0">
                  {currentStatus === "offline" ? "Invisible" : statusLabels[currentStatus]}
                  {currentStatus === "offline" && <span aria-hidden className="w-5 h-5 shrink-0 rounded-full bg-[#f0b232] text-[#313338] text-[13px] font-extrabold leading-none flex items-center justify-center">!</span>}
                </span>
                {currentStatus === "dnd" && <BellOff className="ml-auto w-4 h-4 text-[hsl(var(--icon-default))]" aria-hidden />}
                <ChevronRight className={cn("w-5 h-5 text-[hsl(var(--icon-default))]", currentStatus !== "dnd" && "ml-auto")} />
              </button>
              <div className="absolute left-full top-0 -mt-[48px] pl-1 hidden group-hover/status:block group-focus-within/status:block z-30">
                <div className="w-[300px] p-2 rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                  {STATUS_CHOICES.map((c) => (
                    <div key={c.status} className="relative group/choice">
                      {c.status === "idle" && <div className="mx-3 my-1.5 h-px bg-white/[0.06]" aria-hidden />}
                      <button
                        type="button"
                        onClick={() => handleStatusChange(c.status, null)}
                        className="w-full min-h-10 px-3 py-2 rounded-[4px] flex items-center gap-3 text-left hover:bg-white/[0.06]"
                      >
                        <StatusIndicator status={c.status} className="w-3 h-3 shrink-0" bgClassName="bg-[hsl(var(--popover))]" />
                        <span className="flex-1 min-w-0">
                          <span className="block text-base leading-5 font-medium text-white">{c.label}</span>
                          {c.hint && <span className="block text-sm leading-[18px] text-muted-foreground">{c.hint}</span>}
                        </span>
                        {c.timed && <ChevronRight className="w-5 h-5 text-[hsl(var(--icon-default))]" />}
                      </button>
                      {c.timed && (
                        <div className="absolute left-full top-0 pl-1 hidden group-hover/choice:block z-40">
                          <div className="w-[190px] p-2 rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                            {STATUS_DURATIONS.map((d) => (
                              <button
                                key={d.label}
                                type="button"
                                onClick={() => handleStatusChange(c.status, d.ms)}
                                className="w-full h-9 px-3 rounded-[4px] text-left text-sm font-medium text-white hover:bg-white/[0.06]"
                              >
                                {d.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative group/badges">
              <button type="button" className={panelRow} aria-haspopup="menu">
                <Medal className="w-5 h-5 text-[hsl(var(--icon-default))]" />
                <span className="flex-1 text-left">Badges</span>
              </button>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/badges:block z-30">
                <div className="w-[260px] p-3 rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                  {profile?.id && <UserBadgeList userId={profile.id} size="lg" showEmpty />}
                </div>
              </div>
            </div>
          </div>

          {/* Groupe 2 : comptes, identifiant */}
          <div className={cn(groupCls, "mt-4 mb-4")}>
            <div className={cn("relative group/accounts", rowDivider)}>
              <button type="button" className={panelRow} aria-haspopup="menu">
                <UserRound className="w-5 h-5 text-[hsl(var(--icon-default))]" />
                <span className="flex-1 text-left">Changer de compte</span>
                <ChevronRight className="w-5 h-5 text-[hsl(var(--icon-default))]" />
              </button>
              <div className="absolute left-full top-0 pl-1 hidden group-hover/accounts:block z-30">
                <div className="w-[240px] p-2 rounded-lg bg-[hsl(var(--popover))] border border-white/[0.06] shadow-[0_8px_16px_rgba(0,0,0,0.3)]">
                  <div className="px-3 py-2 text-sm text-muted-foreground">Bientôt disponible</div>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => profile?.id && void copyToClipboard(uuidToSnowflake(profile.id), "Identifiant copié !")}
              className={cn(panelRow, "rounded-b-lg")}
            >
              <IdCard className="w-5 h-5 text-[hsl(var(--icon-default))]" />
              <span className="flex-1 text-left">Copier l'identifiant</span>
            </button>
          </div>
        </PopoverContent>
      </Popover>



      <div className="flex items-center gap-1 shrink-0">
        {/* Micro + chevron */}
        <div className="flex items-center rounded-md">
          <button type="button"
            onClick={() => voiceCtx.toggleMute()}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-l-lg transition-colors",
              voiceCtx.voiceState.isMuted
                ? "text-[hsl(var(--voice-muted))] bg-[hsl(var(--voice-muted-background))] hover:brightness-110"
                : "text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-selected))] hover:text-foreground"
            )}
          >
            {/* Tailles mesurees sur la reference : 22px d'encre (micro, casque, parametres). */}
            {voiceCtx.voiceState.isMuted ? <DiscordMicOff className="w-6 h-6" /> : <DiscordMic className="w-6 h-6" />}
          </button>
          <MicrophoneSettingsPopover
            open={micPopoverOpen}
            onOpenChange={setMicPopoverOpen}
            micVolume={voiceCtx.micVolume}
            onMicVolumeChange={voiceCtx.setMicVolume}
            vadSensitivity={voiceCtx.vadSensitivity}
            onVadSensitivityChange={voiceCtx.setVadSensitivity}
            noiseSuppression={voiceCtx.noiseSuppression}
            onNoiseSuppressionChange={voiceCtx.setNoiseSuppression}
            rnnoiseAvailable={voiceCtx.rnnoiseAvailable}
            enableDeEsser={voiceCtx.audioFilters.deEsser}
            onToggleDeEsser={(v) => voiceCtx.setAudioFilter('deEsser', v)}
            enableLowShelf={voiceCtx.audioFilters.lowShelf}
            onToggleLowShelf={(v) => voiceCtx.setAudioFilter('lowShelf', v)}
            enableHighPass={voiceCtx.audioFilters.highPass}
            onToggleHighPass={(v) => voiceCtx.setAudioFilter('highPass', v)}
            inputDeviceId={voiceCtx.inputDeviceId}
            availableInputs={voiceCtx.availableInputs}
            onInputDeviceChange={voiceCtx.setInputDeviceId}
            micPermission={voiceCtx.micPermission}
            onRequestPermission={voiceCtx.requestMicPermission}
            onOpenRefresh={voiceCtx.refreshDevices}
          >
            <button type="button" className={cn("h-8 w-5 flex items-center justify-center rounded-r-lg transition-colors", voiceCtx.voiceState.isMuted ? cn("text-[hsl(var(--voice-muted))] bg-[hsl(var(--voice-muted-background))] hover:brightness-110", "border-l border-black/15") : "text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-selected))] hover:text-foreground")}>
              {micPopoverOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </MicrophoneSettingsPopover>
        </div>

        {/* Casque + chevron */}
        <div className="flex items-center rounded-md">
          <button type="button"
            onClick={() => voiceCtx.toggleDeafen()}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-l-lg transition-colors",
              voiceCtx.voiceState.isDeafened
                ? "text-[hsl(var(--voice-muted))] bg-[hsl(var(--voice-muted-background))] hover:brightness-110"
                : "text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-selected))] hover:text-foreground"
            )}
          >
            {voiceCtx.voiceState.isDeafened ? <DiscordHeadphonesOff className="w-6 h-6" /> : <DiscordHeadphones className="w-6 h-6" />}
          </button>
          <HeadphonesSettingsPopover
            open={headphonesPopoverOpen}
            onOpenChange={setHeadphonesPopoverOpen}
            outputVolume={voiceCtx.outputVolume}
            onOutputVolumeChange={voiceCtx.setOutputVolume}
            isDeafened={voiceCtx.voiceState.isDeafened}
            onToggleDeafen={() => voiceCtx.toggleDeafen()}
            outputDeviceId={voiceCtx.outputDeviceId}
            availableOutputs={voiceCtx.availableOutputs}
            onOutputDeviceChange={voiceCtx.setOutputDeviceId}
            outputSinkSupported={voiceCtx.outputSinkSupported}
            outputSinkPartial={voiceCtx.outputSinkPartial}
            micPermission={voiceCtx.micPermission}
            onRequestPermission={voiceCtx.requestMicPermission}
            onOpenRefresh={voiceCtx.refreshDevices}
          >
            <button type="button" className={cn("h-8 w-5 flex items-center justify-center rounded-r-lg transition-colors", voiceCtx.voiceState.isDeafened ? cn("text-[hsl(var(--voice-muted))] bg-[hsl(var(--voice-muted-background))] hover:brightness-110", "border-l border-black/15") : "text-[hsl(var(--icon-default))] hover:bg-[hsl(var(--interactive-background-selected))] hover:text-foreground")}>
              {headphonesPopoverOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </HeadphonesSettingsPopover>
        </div>

        {/* Paramètres */}
        <button type="button" onClick={onOpenSettings} aria-label="Paramètres utilisateur" className="h-8 w-8 flex items-center justify-center rounded-lg text-[hsl(var(--icon-default))] hover:text-foreground hover:bg-[hsl(var(--interactive-background-selected))] transition-colors">
          <DiscordSettings className="w-[22px] h-[22px]" />
        </button>
      </div>

      {/* Custom Status Modal */}
      <CustomStatusModal open={showCustomStatusModal} onOpenChange={setShowCustomStatusModal} />
    </div>
  );
}
