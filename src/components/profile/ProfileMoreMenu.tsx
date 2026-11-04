import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { IdCard, Share } from '@/components/icons/discord/lucide';
import { ShareProfileModal } from './ShareProfileModal';
import { copyToClipboard } from '@/lib/clipboard';
import { uuidToSnowflake } from '@/lib/snowflake';
import { cn } from '@/lib/utils';

/* Menu "..." d'un profil : Partager le profil / Copier l'identifiant (video de reference). */
interface Props {
  profile: { id: string; display_name: string; username: string; avatar_url: string | null };
  /** "round" : pastille sombre posee sur la banniere ; "square" : bouton de la rangee d'actions. */
  variant: 'round' | 'square';
}

export function ProfileMoreMenu({ profile, variant }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Plus"
            className={cn(
              'flex items-center justify-center transition-colors text-white',
              variant === 'round'
                ? 'w-8 h-8 rounded-full bg-[hsl(220_8%_14%/0.85)] hover:bg-black'
                : 'w-[38px] h-[38px] rounded-lg bg-[#43434b] hover:bg-[#4b4b54] text-white',
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={6} className="z-[140] min-w-[200px] p-2 rounded-lg bg-[#3b3b45] border border-white/[0.08] shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
          <DropdownMenuItem className="h-9 gap-3 px-2 rounded-[4px] text-sm" onSelect={() => setShareOpen(true)}>
            <Share className="w-[18px] h-[18px]" /> Partager le profil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="h-9 gap-3 px-2 rounded-[4px] text-sm" onSelect={() => void copyToClipboard(uuidToSnowflake(profile.id), "Identifiant copié !")}>
            <IdCard className="w-[18px] h-[18px]" /> Copier l'identifiant
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ShareProfileModal open={shareOpen} onOpenChange={setShareOpen} profile={profile} />
    </>
  );
}
