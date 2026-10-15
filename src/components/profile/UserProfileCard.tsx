import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { UserAvatarImage } from "@/components/ui/user-avatar-image";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CustomStatusBubble } from "./CustomStatusBubble";
import { useAuth } from "@/contexts/AuthContext";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { Pencil, ChevronRight, ChevronDown, ChevronUp, Smile, Gamepad2, Headphones, HeadphoneOff, Eye, Trophy, Copy, Settings, Mic, MicOff, Plus } from "lucide-react";
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
import { MicrophoneSettingsPopover } from "@/components/channels/voice/MicrophoneSettingsPopover";
import { HeadphonesSettingsPopover } from "@/components/channels/voice/HeadphonesSettingsPopover";

const statusColors = {
  online: "bg-[hsl(var(--online))]",
  idle: "bg-[hsl(var(--idle))]",
  dnd: "bg-[hsl(var(--dnd))]",
  offline: "bg-[hsl(var(--offline))]",
};

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
}

export function UserProfileCard({ onOpenSettings, onOpenProfile, speakingUsers, connectedToVoice }: UserProfileCardProps) {
  const { profile } = useAuth();
  const { setManualStatus } = usePresenceContext();
  const voiceCtx = useVoice();
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

  const handleStatusChange = (status: "online" | "idle" | "dnd" | "offline") => {
    // Informer le système de présence que c'est un changement manuel
    setManualStatus(status);
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
        "w-full shrink-0 h-[52px] px-2 flex items-center bg-[hsl(var(--input))] border-t border-white/[0.06]",
      )}
    >
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="flex items-center gap-2 flex-1 min-w-0 hover:bg-muted rounded-md pr-1 py-0.5 transition-colors text-left">
            <div className="relative">
              <div
                className={cn(
                  // No transition: all three speaking rings (this one, the channel-list
                // one, and the big participant card) must light up on the SAME
                // frame. A colour transition here made this ring visibly trail
                // the others by their duration.
                "rounded-full border-2",
                isSpeakingSelf ? "border-[hsl(var(--online))]" : "border-primary/30",
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
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[hsl(var(--input))]"
                bgClassName="bg-[hsl(var(--input))]"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              {/* Discord's panel type scale: display name is `text-md/medium`
                  (16px / 500), status line is `text-sm/medium` (14px). */}
              <p className="text-base font-medium leading-tight truncate">{profile?.display_name || "Chargement..."}</p>
              <div className="text-sm text-muted-foreground leading-tight truncate">{getDisplayText()}</div>
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent ref={popoverRef} align="start" side="top" className="w-72 p-0 overflow-hidden">
          {/* Profile Header with Banner */}
          <div className="relative">
            {profile?.banner_url ? (
              <img src={profile.banner_url} alt="Banner" className="h-16 w-full object-cover" />
            ) : (
              <div className="h-16 bg-gradient-to-r from-primary to-primary/50" />
            )}

            {/* Avatar overlapping banner */}
            <div className="absolute -bottom-6 left-3">
              <UserAvatarImage
                src={profile?.avatar_url}
                alt={profile?.display_name}
                className="w-14 h-14 border-4 border-card"
                fallbackClassName="bg-primary/20 text-primary text-lg"
                fallback={profile?.display_name?.charAt(0).toUpperCase() || '?'}
              />

              <StatusIndicator
                status={currentStatus}
                className="absolute bottom-0 right-0 w-4 h-4 border-2 border-card"
              />
            </div>

            {/* Custom status bubble — aligned to the avatar like the mobile profile */}
            <div className="absolute left-[84px] top-[54px] z-20 max-w-[172px]">
              <CustomStatusBubble
                customStatus={profile?.custom_status}
                status={currentStatus}
                onClick={() => setShowCustomStatusModal(true)}
                size="sm"
                showPlaceholder
              />
            </div>
          </div>


          {/* User Info */}
          <div className="pt-8 px-3 pb-3">
            <div className="mb-2">
              <p className="font-semibold text-foreground">{profile?.display_name}</p>
              <p className="text-xs text-muted-foreground">{profile?.username?.toLowerCase()}</p>
            </div>

            {/* Edit Profile Button */}
            <Button variant="outline" size="sm" className="w-full mb-3" onClick={onOpenProfile}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Modifier profil
            </Button>

            <div className="border-t border-border pt-2 space-y-0.5">
              {/* Status Selector with Portal */}
              <div className="relative" onMouseLeave={startCloseTimer}>
                <button type="button"
                  ref={statusButtonRef}
                  onMouseEnter={() => { cancelCloseTimer(); handleStatusHover(); }}
                  className="flex items-center justify-between w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
                >
                  <div className="flex items-center gap-2">
                    <StatusIndicator status={currentStatus} className="w-2.5 h-2.5" bgClassName="bg-popover" />
                    <span>{statusLabels[currentStatus]}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Status Menu via Portal */}
                {showStatusMenu && createPortal(
                  <div
                    className="fixed z-[100]"
                    style={{ top: menuPosition.top, left: menuPosition.left }}
                    onMouseEnter={cancelCloseTimer}
                    onMouseLeave={startCloseTimer}
                  >
                    {/* Invisible bridge to connect popover to this menu */}
                    <div className="absolute top-0 -left-1 w-1 h-full" />
                    {/* Actual menu content */}
                    <div className="w-44 bg-popover border border-border rounded-lg shadow-xl p-1.5 animate-slide-in-right">
                      <p className="text-xs text-muted-foreground px-2 py-1 mb-1">Définir le statut</p>
                      {(Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => (
                        <button type="button"
                          key={status}
                          onClick={() => handleStatusChange(status)}
                          className={cn(
                            "flex items-center gap-2.5 w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                            currentStatus === status ? "bg-primary/20 text-primary" : "hover:bg-muted",
                          )}
                        >
                          <StatusIndicator status={status} className="w-2.5 h-2.5" bgClassName="bg-popover" />
                          <span>{statusLabels[status]}</span>
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* Custom Status Button */}
              <button type="button"
                onClick={() => setShowCustomStatusModal(true)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
              >
                <Smile className="w-4 h-4 text-muted-foreground" />
                <span>Définir un statut personnalisé</span>
              </button>

              {/* Copy ID */}
              <button type="button"
                onClick={() => {
                  if (profile?.id) {
                    const snowflakeId = uuidToSnowflake(profile.id);
                    copyToClipboard(snowflakeId, "Identifiant copié !");
                  }
                }}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
                <span>Copier ton identifiant</span>
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/*
       * The 1px divider Discord puts between the identity block and the
       * voice/settings toolbar (.dot__9293f: 1px wide, 24px tall, 8px margins,
       * tinted with --background-modifier-accent). It was missing entirely,
       * which is why the controls read as loose debris next to the name.
       */}
      <div className="w-px h-6 mx-2 shrink-0 bg-foreground/[0.06]" aria-hidden />

      <div className="flex items-center gap-1 shrink-0">
        {/* Micro + chevron */}
        <div className="flex items-center rounded-md">
          <button type="button"
            onClick={() => voiceCtx.toggleMute()}
            className={cn(
              "p-1 rounded-l-md transition-colors",
              voiceCtx.voiceState.isMuted
                ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {voiceCtx.voiceState.isMuted ? <DiscordMicOff className="w-6 h-6" /> : <DiscordMic className="w-6 h-6 text-muted-foreground" />}
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
            <button type="button" className={cn("px-1 py-1 rounded-r-md transition-colors border-l border-border/30", voiceCtx.voiceState.isMuted ? "text-destructive bg-destructive/10 hover:bg-destructive/20" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {micPopoverOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </MicrophoneSettingsPopover>
        </div>

        {/* Casque + chevron */}
        <div className="flex items-center rounded-md">
          <button type="button"
            onClick={() => voiceCtx.toggleDeafen()}
            className={cn(
              "p-1 rounded-l-md transition-colors",
              voiceCtx.voiceState.isDeafened
                ? "text-destructive bg-destructive/10 hover:bg-destructive/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {voiceCtx.voiceState.isDeafened ? <DiscordHeadphonesOff className="w-6 h-6" /> : <DiscordHeadphones className="w-6 h-6 text-muted-foreground" />}
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
            <button type="button" className={cn("px-1 py-1 rounded-r-md transition-colors border-l border-border/30", voiceCtx.voiceState.isDeafened ? "text-destructive bg-destructive/10 hover:bg-destructive/20" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {headphonesPopoverOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </HeadphonesSettingsPopover>
        </div>

        {/* Paramètres */}
        <button type="button" onClick={onOpenSettings} aria-label="Paramètres utilisateur" className="p-1 hover:bg-muted rounded-md transition-colors ml-1">
          <DiscordSettings className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      {/* Custom Status Modal */}
      <CustomStatusModal open={showCustomStatusModal} onOpenChange={setShowCustomStatusModal} />
    </div>
  );
}
