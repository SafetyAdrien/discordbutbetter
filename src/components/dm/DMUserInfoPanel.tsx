import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutualServers } from '@/hooks/useMutualServers';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  online: 'bg-green-500',
  idle: 'bg-yellow-500',
  dnd: 'bg-red-500',
  offline: 'bg-gray-500',
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
}

export function DMUserInfoPanel({ participant, onViewFullProfile }: DMUserInfoPanelProps) {
  const { data: mutualServers = [] } = useMutualServers(participant.id);

  const memberSince = participant.created_at 
    ? format(new Date(participant.created_at), 'd MMM yyyy', { locale: fr })
    : null;

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col shrink-0">
      <ScrollArea className="flex-1">
        {/* Banner */}
        <div 
          className="h-24 relative"
          style={{
            backgroundColor: participant.banner_url ? undefined : 'hsl(var(--primary))',
            backgroundImage: participant.banner_url ? `url(${participant.banner_url})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />

        {/* Avatar */}
        <div className="px-4 -mt-10 relative z-10">
          <div className="relative inline-block">
            <Avatar className="w-20 h-20 border-4 border-card">
              <AvatarImage src={participant.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {participant.display_name?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className={cn(
              "absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-card",
              statusColors[participant.status || 'offline']
            )} />
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 pt-3 pb-4">
          <h3 className="text-lg font-semibold">{participant.display_name}</h3>
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
        {memberSince && (
          <>
            <div className="mx-4 h-px bg-border" />
            <div className="px-4 py-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Membre Discord depuis
              </h4>
              <p className="text-sm text-foreground">{memberSince}</p>
            </div>
          </>
        )}

        {/* Mutual Servers */}
        {mutualServers.length > 0 && (
          <>
            <div className="mx-4 h-px bg-border" />
            <div className="px-4 py-3">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-3">
                Serveurs en commun — {mutualServers.length}
              </h4>
              <div className="flex flex-wrap gap-2">
                {mutualServers.map(server => (
                  <Tooltip key={server.id}>
                    <TooltipTrigger asChild>
                      <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={server.icon_url || undefined} />
                        <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                          {server.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{server.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>
          </>
        )}

        {/* View Full Profile Link */}
        <div className="mx-4 h-px bg-border" />
        <div className="px-4 py-3">
          <button
            onClick={onViewFullProfile}
            className="text-sm text-primary hover:underline cursor-pointer"
          >
            Voir le profil complet
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
