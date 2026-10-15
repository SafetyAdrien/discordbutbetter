import { ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { StreamlineHash } from '@/components/icons/StreamlineHash';
import { StreamlineVoice } from '@/components/icons/StreamlineVoice';
import { StreamlineForum } from '@/components/icons/StreamlineForum';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { StreamlineMedia } from '@/components/icons/StreamlineMedia';
import { StreamlineCalendar } from '@/components/icons/StreamlineCalendar';
import { StreamlineTasks } from '@/components/icons/StreamlineTasks';
import { StreamlineStage } from '@/components/icons/StreamlineStage';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MemberList } from '@/components/layout/MemberList';
import type { User } from '@/types/app';
import type { MemberWithProfile } from '@/hooks/useMembers';

const channelIcons: Record<string, React.ElementType> = {
  text: StreamlineHash,
  voice: StreamlineVoice,
  forum: StreamlineForum,
  announcement: StreamlineMegaphone,
  media: StreamlineMedia,
  calendar: StreamlineCalendar,
  tasks: StreamlineTasks,
  stage: StreamlineStage,
};

interface Props {
  channelName: string;
  channelType: string;
  description?: string;
  onlineCount?: number;
  onBack: () => void;
  /** Fallback handler if no members list is provided (legacy). */
  onOpenDetails?: () => void;
  rightSlot?: ReactNode;
  /** When provided, tapping the title opens an integrated Members sheet. */
  members?: (User & { roles?: MemberWithProfile['roles'] })[];
  ownerId?: string;
  serverId?: string;
  onOpenDM?: (id: string) => void;
  /** Custom channel icon URL, replaces the default type icon when set. */
  iconUrl?: string | null;
}

/**
 * Unified mobile channel header used by every channel type.
 * Visually identical to the standard text-channel header: back + icon + name + chevron
 * + online count, with the title block opening a Members sheet, plus a configurable rightSlot.
 */
export function MobileChannelHeader({
  channelName,
  channelType,
  description,
  onlineCount,
  onBack,
  onOpenDetails,
  rightSlot,
  members,
  ownerId,
  serverId,
  onOpenDM,
  iconUrl,
}: Props) {
  const Icon = channelIcons[channelType] || StreamlineHash;
  const [membersOpen, setMembersOpen] = useState(false);
  const hasMembersSheet = Array.isArray(members);

  const titleButton = (
    <button
      type="button"
      onClick={hasMembersSheet ? undefined : onOpenDetails}
      className="flex-1 min-w-0 flex items-center gap-2.5 px-1 py-1.5 rounded-xl active:bg-primary/8 transition-colors text-left"
      aria-label={hasMembersSheet ? `Membres du salon ${channelName}` : `Détails du salon ${channelName}`}
    >
      <div className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {iconUrl ? (
          <img src={iconUrl} alt="" className="w-[22px] h-[22px] rounded-sm object-contain" />
        ) : (
          <Icon className="w-[22px] h-[22px] text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="flex items-center gap-0.5 min-w-0">
          <h2 className="font-semibold text-sm truncate">{channelName}</h2>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 -ml-0.5" />
        </div>
        {typeof onlineCount === 'number' && (
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--online))]" />
            <span className="tabular-nums">{onlineCount}</span>
            <span>En ligne</span>
          </div>
        )}
      </div>
    </button>
  );

  return (
    <div
      className="min-h-16 py-2 px-1.5 flex items-center gap-1 bg-[hsl(var(--surface-1))] flex-shrink-0 rounded-b-2xl"
      style={{ boxShadow: 'var(--shadow-elevation-1)' }}
    >
      <button type="button"
        onClick={onBack}
        aria-label="Retour"
        title="Retour"
        className="p-2 rounded-full active:bg-primary/10 transition-all duration-200 flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {hasMembersSheet ? (
        <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
          <SheetTrigger asChild>{titleButton}</SheetTrigger>
          <SheetContent
            side="right"
            className="w-[85vw] max-w-80 p-0 rounded-l-2xl bg-surface-1 [&>button.absolute]:hidden"
          >
            <VisuallyHidden>
              <SheetTitle>Membres du salon {channelName}</SheetTitle>
            </VisuallyHidden>
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground ml-1">Membres</h3>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 mr-0.5 rounded-full" aria-label="Fermer">
                  <X className="w-4 h-4" />
                </Button>
              </SheetClose>
            </div>
            {description && (
              <>
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
                <Separator />
              </>
            )}
            <MemberList
              members={members!}
              ownerId={ownerId || ''}
              serverId={serverId}
              onOpenDM={onOpenDM || (() => {})}
            />
          </SheetContent>
        </Sheet>
      ) : (
        titleButton
      )}

      {rightSlot && <div className="flex items-center gap-1 flex-shrink-0">{rightSlot}</div>}
    </div>
  );
}
