import { useState, useRef, useEffect, useCallback } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { usePresenceContext } from "@/contexts/PresenceContext";
import { Pencil, ChevronRight, Smile, Gamepad2, Headphones, HeadphoneOff, Eye, Trophy, Copy, Settings, Mic, MicOff, Plus } from "lucide-react";
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
}

export function UserProfileCard({ onOpenSettings, onOpenProfile, speakingUsers }: UserProfileCardProps) {
  const { profile, updateStatus } = useAuth();
  const { setManualStatus } = usePresenceContext();
  const voiceCtx = useVoice();
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showCustomStatusModal, setShowCustomStatusModal] = useState(false);
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
        <span className="flex items-center gap-1 text-xs text-muted-foreground truncate">
          <ActivityIcon className="w-3 h-3 text-primary flex-shrink-0" />
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
    // Mettre à jour le profil
    updateStatus(status);
    setShowStatusMenu(false);
  };

  return (
    <div className="h-14 px-2 flex items-center gap-2 bg-[hsl(var(--user-panel))] border-t border-border/50">
      <Popover>
        <PopoverTrigger asChild>
          <button className="flex items-center gap-2 flex-1 min-w-0 hover:bg-muted rounded-md p-1 transition-colors">
            <div className="relative">
              <Avatar
                className={cn(
                  "w-8 h-8 transition-all",
                  profile?.id && speakingUsers?.has(profile.id)
                    ? "ring-2 ring-[hsl(var(--voice-active))] voice-active-ring"
                    : "ring-2 ring-primary/30",
                )}
              >
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {profile?.display_name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <StatusIndicator
                status={currentStatus}
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-background"
                bgClassName="bg-background"
              />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate">{profile?.display_name || "Chargement..."}</p>
              <div className="text-xs text-muted-foreground truncate">{getDisplayText()}</div>
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
              <Avatar className="w-14 h-14 border-4 border-card">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary text-lg">
                  {profile?.display_name?.charAt(0).toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <StatusIndicator
                status={currentStatus}
                className="absolute bottom-0 right-0 w-4 h-4 border-2 border-card"
              />
            </div>

            {/* Custom status bubble — pinned to the banner edge (parity with mobile) */}
            <button
              type="button"
              onClick={() => setShowCustomStatusModal(true)}
              aria-label="Modifier le statut personnalisé"
              className="absolute left-20 top-[44px] z-20 inline-flex items-center gap-1.5 pl-1.5 pr-2.5 py-1 rounded-full bg-[hsl(220_8%_18%)] hover:bg-[hsl(220_8%_22%)] transition-colors shadow-md max-w-[180px]"
            >
              <span aria-hidden className="absolute -left-2 -top-3 w-2.5 h-2.5 rounded-full bg-[hsl(220_8%_18%)] shadow" />
              <span aria-hidden className="absolute left-1 -top-1 w-2.5 h-2.5 rounded-[3px_50%_50%_50%] bg-[hsl(220_8%_18%)]" />
              <span className="shrink-0 w-4 h-4 text-foreground flex items-center justify-center">
                <Plus className="w-3 h-3" strokeWidth={2.5} />
              </span>
              <span className={cn(
                "text-xs italic truncate",
                profile?.custom_status ? "text-foreground" : "text-muted-foreground"
              )}>
                {profile?.custom_status || "Quoi de neuf ?"}
              </span>
            </button>
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
                <button
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
                        <button
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
              <button
                onClick={() => setShowCustomStatusModal(true)}
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-sm"
              >
                <Smile className="w-4 h-4 text-muted-foreground" />
                <span>Définir un statut personnalisé</span>
              </button>

              {/* Copy ID */}
              <button
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

      <button
        onClick={() => voiceCtx.toggleMute()}
        className={cn(
          "p-1.5 hover:bg-muted rounded-md transition-colors",
          voiceCtx.voiceState.isMuted && "text-destructive"
        )}
      >
        {voiceCtx.voiceState.isMuted ? <DiscordMicOff className="w-4 h-4" /> : <DiscordMic className="w-4 h-4 text-muted-foreground" />}
      </button>
      <button
        onClick={() => voiceCtx.toggleDeafen()}
        className={cn(
          "p-1.5 hover:bg-muted rounded-md transition-colors",
          voiceCtx.voiceState.isDeafened && "text-destructive"
        )}
      >
        {voiceCtx.voiceState.isDeafened ? <DiscordHeadphonesOff className="w-4 h-4" /> : <DiscordHeadphones className="w-4 h-4 text-muted-foreground" />}
      </button>
      <button onClick={onOpenSettings} className="p-1.5 hover:bg-muted rounded-md transition-colors">
        <DiscordSettings className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Custom Status Modal */}
      <CustomStatusModal open={showCustomStatusModal} onOpenChange={setShowCustomStatusModal} />
    </div>
  );
}
