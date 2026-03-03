import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight } from 'lucide-react';
import { useMutualServers } from '@/hooks/useMutualServers';
import { useUserNote } from '@/hooks/useUserNotes';
import { format } from 'date-fns';
import { parseMarkdown } from '@/lib/markdown';
import { fr } from 'date-fns/locale';

const NoteAddIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path fillRule="evenodd" d="M5 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h9c.1 0 .12-.11.04-.15a3 3 0 0 1-2.03-3.16c.04-.34-.2-.69-.55-.69H6a1 1 0 1 1 0-2h9.5a.5.5 0 0 0 .5-.5V15a3 3 0 0 1 .19-1.05c.15-.4-.11-.95-.54-.95H6a1 1 0 1 1 0-2h12a1 1 0 0 1 .88.52c.13.24.35.48.62.52A3 3 0 0 1 21.83 14v.02c.02.06.17.05.17-.02V5a3 3 0 0 0-3-3H5Zm1 4a1 1 0 0 0 0 2h5a1 1 0 1 0 0-2H6Z" clipRule="evenodd" />
    <path d="M19 14a1 1 0 0 1 1 1v3h3a1 1 0 1 1 0 2h-3v3a1 1 0 1 1-2 0v-3h-3a1 1 0 1 1 0-2h3v-3a1 1 0 0 1 1-1Z" />
  </svg>
);
const statusColors: Record<string, string> = {
  online: 'bg-[hsl(var(--online))]',
  idle: 'bg-[hsl(var(--idle))]',
  dnd: 'bg-[hsl(var(--dnd))]',
  offline: 'bg-[hsl(var(--offline))]'
};
export interface DMParticipant {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  status: string;
  created_at?: string | null;
}
interface DMUserInfoPanelProps {
  participant: DMParticipant;
  onViewFullProfile: () => void;
  onOpenNotes?: () => void;
}
export function DMUserInfoPanel({
  participant,
  onViewFullProfile,
  onOpenNotes
}: DMUserInfoPanelProps) {
  const [serversOpen, setServersOpen] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const {
    data: mutualServers = []
  } = useMutualServers(participant.id);
  const { data: userNote } = useUserNote(participant.id);
  const memberSince = participant.created_at ? format(new Date(participant.created_at), 'd MMM yyyy', {
    locale: fr
  }) : null;
  const hasNote = userNote?.content && userNote.content.trim().length > 0;
  return <div 
    className="w-72 border-l border-border bg-card flex flex-col shrink-0"
    onMouseEnter={() => setIsHovering(true)}
    onMouseLeave={() => setIsHovering(false)}
  >
      <ScrollArea className="flex-1">
        {/* Banner */}
        <div className="h-24 relative" style={{
        backgroundColor: participant.banner_url ? undefined : 'hsl(var(--primary))',
        backgroundImage: participant.banner_url ? `url(${participant.banner_url})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }} />

        {/* Avatar */}
        <div className="px-4 -mt-10 relative z-10">
          <div className="relative inline-block">
            <Avatar className="w-20 h-20 border-4 border-card">
              <AvatarImage src={participant.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {participant.display_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn("absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-card", statusColors[participant.status || 'offline'])} />
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{participant.display_name}</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onOpenNotes}
                  className={cn(
                    "p-1 rounded hover:bg-muted/50",
                    hasNote && "text-primary",
                    !isHovering && "invisible"
                  )}
                >
                  <NoteAddIcon className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {hasNote ? 'Voir la note' : 'Ajouter une note'}
              </TooltipContent>
            </Tooltip>
          </div>
          <p className="text-sm text-muted-foreground">@{participant.username.toLowerCase()}</p>
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-border" />

        {/* Bio Section */}
        <div className="px-4 py-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            À Propos de Moi
          </h4>
          <div className="text-sm text-foreground">
            {participant.bio ? parseMarkdown(participant.bio) : "Aucune biographie définie."}
          </div>
        </div>

        {/* Member Since */}
        {memberSince && <>
            <div className="mx-4 h-px bg-border" />
            <div className="px-4 py-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Membre Discord depuis
              </h4>
              <p className="text-sm text-foreground">{memberSince}</p>
            </div>
          </>}

        {/* Mutual Servers */}
        {mutualServers.length > 0 && <>
            <div className="mx-4 h-px bg-border" />
            <div className="px-4 py-3">
              <Collapsible open={serversOpen} onOpenChange={setServersOpen}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Serveurs en commun — {mutualServers.length}
                    </span>
                    <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", serversOpen && "rotate-90")} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="flex flex-col gap-1">
                    {mutualServers.map(server => <div key={server.id} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/30 transition-colors">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={server.icon_url || undefined} />
                          <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                            {server.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground">{server.name}</span>
                      </div>)}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </>}

      </ScrollArea>

      {/* View Full Profile Link - Fixed at bottom */}
      <div className="border-t border-border px-4 py-3 shrink-0 flex items-center justify-center">
        <button onClick={onViewFullProfile} className="text-sm cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
          Voir le profil complet
        </button>
      </div>
    </div>;
}