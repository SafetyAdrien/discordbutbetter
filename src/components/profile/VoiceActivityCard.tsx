import { Info, MoreHorizontal, Pencil } from 'lucide-react';
import { Volume2 } from '@/components/icons/discord/lucide';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserVoiceActivity } from '@/hooks/useUserVoiceActivity';
import { useAuth } from '@/contexts/AuthContext';
import { OPEN_SERVER_EVENT, OPEN_VOICE_STATUS_EVENT } from '@/lib/invites';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';

/*
 * Carte "Dans un salon vocal" des profils (video de reference) : titre avec (i) et menu "...", vignette carree
 * avec l'avatar cerclé, "🔊 salon" en gras, "dans <serveur>", "Définir un statut de salon" (stylo) ou le statut,
 * puis "Ouvrir le salon vocal". Visible seulement quand la personne est connectee a un salon.
 */

interface Props {
  user: { id: string; display_name: string; avatar_url: string | null };
  className?: string;
}

export function VoiceActivityCard({ user, className }: Props) {
  const { user: me } = useAuth();
  const { data: a } = useUserVoiceActivity(user.id);
  if (!a) return null;
  const mine = me?.id === user.id;

  const open = () => window.dispatchEvent(new CustomEvent(OPEN_SERVER_EVENT, { detail: { serverId: a.serverId, channelId: a.channelId } }));
  const editStatus = () => window.dispatchEvent(new CustomEvent(OPEN_VOICE_STATUS_EVENT, { detail: a.channelId }));

  return (
    <section aria-label="Dans un salon vocal" className={cn('rounded-lg bg-[#2f2f37] p-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#dbdee1]">
          Dans un salon vocal
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex text-[#b5bac1]"><Info className="w-3.5 h-3.5" /></span>
            </TooltipTrigger>
            <TooltipContent side="top">Visible par les personnes qui peuvent voir ton profil</TooltipContent>
          </Tooltip>
        </p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="Plus d'options" className="w-6 h-6 rounded flex items-center justify-center text-[#b5bac1] hover:text-white hover:bg-white/[0.08]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="z-[140] min-w-[200px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08]">
            <DropdownMenuItem className="h-9 px-2 rounded-[4px] text-sm" onSelect={open}>Ouvrir le salon vocal</DropdownMenuItem>
            <DropdownMenuItem className="h-9 px-2 rounded-[4px] text-sm" onSelect={() => void copyToClipboard(a.channelId, 'ID du salon copié')}>Copier l'ID du salon</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="w-[70px] h-[70px] shrink-0 rounded-lg bg-[#3e3e48] flex items-center justify-center">
          <span className="rounded-full ring-2 ring-[#9a9aa6]">
            <UserAvatarImage src={user.avatar_url} alt="" className="w-[52px] h-[52px]" fallbackClassName="bg-primary/20 text-primary text-lg" fallback={user.display_name.charAt(0).toUpperCase()} ownerId={user.id} />
          </span>
        </div>
        <div className="min-w-0 text-[13px] leading-[18px]">
          <p translate="no" className="flex items-center gap-1 text-[15px] font-semibold text-white truncate">
            <Volume2 className="w-4 h-4 shrink-0" /> <span className="truncate">{a.channelName}</span>
          </p>
          {a.serverName && <p translate="no" className="text-[#dbdee1] truncate">dans {a.serverName}</p>}
          {mine ? (
            <button type="button" onClick={editStatus} className="mt-0.5 inline-flex items-center gap-1 text-[#dbdee1] hover:text-white hover:underline text-left max-w-full">
              <span className="truncate">{a.voiceStatus || 'Définir un statut de salon'}</span> <Pencil className="w-3 h-3 shrink-0" />
            </button>
          ) : (
            a.voiceStatus && <p className="text-[#dbdee1] truncate">{a.voiceStatus}</p>
          )}
        </div>
      </div>

      <button type="button" onClick={open} className="mt-3 w-full h-9 rounded-[4px] bg-[#4a4a54] hover:bg-[#52525d] text-sm font-medium text-white transition-colors">
        Ouvrir le salon vocal
      </button>
    </section>
  );
}
