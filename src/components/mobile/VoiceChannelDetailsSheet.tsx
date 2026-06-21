import { useState } from 'react';
import { Sheet, SheetContent, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X, ChevronRight, Settings, Headphones, Video, UserPlus, Lock } from 'lucide-react';
import { MemberList } from '@/components/layout/MemberList';
import { ChannelSettingsModal } from '@/components/channel-settings/ChannelSettingsModal';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { AccountSettingsModal } from '@/components/account-settings/AccountSettingsModal';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { toast } from 'sonner';
import type { User } from '@/types/app';
import type { MemberWithProfile } from '@/hooks/useMembers';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: { id: string; name: string };
  serverId: string;
  serverName?: string;
  ownerId: string;
  members: (User & { roles?: MemberWithProfile['roles'] })[];
  onOpenDM: (id: string) => void;
  isDeafened: boolean;
  onToggleDeafen: () => void;
  videoOnly: boolean;
  onToggleVideoOnly: (v: boolean) => void;
}

export function VoiceChannelDetailsSheet({
  open,
  onOpenChange,
  channel,
  serverId,
  serverName,
  ownerId,
  members,
  onOpenDM,
  isDeafened,
  onToggleDeafen,
  videoOnly,
  onToggleVideoOnly,
}: Props) {
  const [channelSettingsOpen, setChannelSettingsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [voiceSettingsOpen, setVoiceSettingsOpen] = useState(false);

  const handleCopyId = async () => {
    try {
      const snowflake = uuidToSnowflake(channel.id);
      await copyToClipboard(snowflake);
      toast.success('ID copié');
    } catch {
      toast.error('Impossible de copier');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="p-0 rounded-t-3xl bg-[hsl(var(--surface-1))] border-t border-white/5 max-h-[92vh] overflow-y-auto [&>button.absolute]:hidden"
        >
          {/* Drag handle */}
          <div className="pt-2 pb-1 flex justify-center">
            <div className="w-9 h-1 rounded-full bg-white/15" />
          </div>

          {/* Header */}
          <div className="px-5 pt-3 pb-4 text-center relative">
            <SheetClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 rounded-full"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </Button>
            </SheetClose>
            <h2 className="text-xl font-bold text-foreground truncate">{channel.name}</h2>
            {serverName && <p className="text-sm text-muted-foreground mt-0.5 truncate">{serverName}</p>}
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[hsl(var(--online))]/10 text-[hsl(var(--online))] text-xs font-medium">
              <Lock className="w-3 h-3" />
              <span>Chiffré de bout en bout</span>
            </div>
          </div>

          {/* Channel Settings card */}
          <div className="px-3">
            <button
              type="button"
              onClick={() => setChannelSettingsOpen(true)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-[hsl(var(--surface-2))] active:bg-[hsl(var(--surface-3))] transition-colors text-left"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Paramètres du salon</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Modifier les préférences de cet espace
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          </div>

          {/* Voice options card */}
          <div className="px-3 mt-3">
            <div className="rounded-2xl bg-[hsl(var(--surface-2))] overflow-hidden">
              <button
                type="button"
                onClick={() => setVoiceSettingsOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-[hsl(var(--surface-3))] transition-colors text-left"
              >
                <Settings className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">Paramètres vocaux</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Ajuste tes réglages voix et vidéo
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
              <Separator className="bg-white/5" />
              <div className="flex items-center gap-3 px-4 py-3">
                <Headphones className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">Mode sourdine</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Coupe tous les sons</div>
                </div>
                <Switch checked={isDeafened} onCheckedChange={onToggleDeafen} />
              </div>
              <Separator className="bg-white/5" />
              <div className="flex items-center gap-3 px-4 py-3">
                <Video className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground">Vidéos uniquement</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Masque les participants sans vidéo
                  </div>
                </div>
                <Switch checked={videoOnly} onCheckedChange={onToggleVideoOnly} />
              </div>
            </div>
          </div>

          {/* Members section */}
          <div className="px-5 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {members.length} {members.length > 1 ? 'Membres' : 'Membre'}
            </h3>
          </div>
          <div className="px-3 mt-2">
            <div className="rounded-2xl bg-[hsl(var(--surface-2))] overflow-hidden">
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="w-full flex items-center gap-3 px-4 py-3 active:bg-[hsl(var(--surface-3))] transition-colors text-left"
              >
                <UserPlus className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 text-sm font-semibold text-foreground">Inviter un ami</div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </button>
              <Separator className="bg-white/5" />
              <div className="max-h-[40vh] overflow-y-auto">
                <MemberList
                  members={members}
                  ownerId={ownerId}
                  serverId={serverId}
                  onOpenDM={onOpenDM}
                />
              </div>
            </div>
          </div>

          {/* For Developers */}
          <div className="px-5 mt-5">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pour les développeurs
            </h3>
          </div>
          <div className="px-3 mt-2 mb-6">
            <button
              type="button"
              onClick={handleCopyId}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-[hsl(var(--surface-2))] active:bg-[hsl(var(--surface-3))] transition-colors text-left"
            >
              <Settings className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 text-sm font-semibold text-foreground">Copier l'ID du salon</div>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {channelSettingsOpen && (
        <ChannelSettingsModal
          channelId={channel.id}
          serverId={serverId}
          onClose={() => setChannelSettingsOpen(false)}
        />
      )}
      {inviteOpen && (
        <CreateInviteModal
          serverId={serverId}
          channelName={channel.name}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {voiceSettingsOpen && (
        <AccountSettingsModal onClose={() => setVoiceSettingsOpen(false)} />
      )}
    </>
  );
}
