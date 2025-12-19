import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PublishedMessageHeaderProps {
  serverName: string;
  channelName: string;
  serverIcon: string | null;
}

export function PublishedMessageHeader({
  serverName,
  channelName,
  serverIcon,
}: PublishedMessageHeaderProps) {
  return (
    <div className="flex items-center gap-2">
      <Avatar className="w-10 h-10 rounded-full">
        {serverIcon ? (
          <AvatarImage src={serverIcon} alt={serverName} />
        ) : null}
        <AvatarFallback className="bg-primary text-primary-foreground">
          {serverName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-2">
        <span className="font-medium hover:underline cursor-pointer">
          {serverName} #{channelName}
        </span>
        <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">
          SERVEUR
        </Badge>
      </div>
    </div>
  );
}
