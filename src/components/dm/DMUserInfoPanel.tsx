import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, StickyNote } from 'lucide-react';
import { useMutualServers } from '@/hooks/useMutualServers';
import { useUserNote } from '@/hooks/useUserNotes';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500'
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
  const {
    data: mutualServers = []
  } = useMutualServers(participant.id);
  const { data: userNote } = useUserNote(participant.id);
  const memberSince = participant.created_at ? format(new Date(participant.created_at), 'd MMM yyyy', {
    locale: fr
  }) : null;
  const hasNote = userNote?.content && userNote.content.trim().length > 0;
  return <div className="w-72 border-l border-border bg-card flex flex-col shrink-0">
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
                    "p-1 rounded hover:bg-muted/50 transition-colors",
                    hasNote && "text-primary"
                  )}
                >
                  <StickyNote className="w-4 h-4" />
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
          <p className="text-sm text-foreground">
            {participant.bio || "Aucune biographie définie."}
          </p>
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
        <button onClick={onViewFullProfile} className="text-sm cursor-pointer text-[#b0b1b5] hover:text-foreground transition-colors">
          Voir le profil complet
        </button>
      </div>
    </div>;
}