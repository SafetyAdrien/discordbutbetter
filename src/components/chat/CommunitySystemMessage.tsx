import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ShieldCheck } from "lucide-react";
import { Check } from "@/components/icons/discord/lucide";
import { DiscordCommunity } from "@/components/icons/DiscordCommunity";

/*
 * Messages systeme publies a l'activation de la Communaute (trigger
 * community_enabled_messages), reproduits de Discord :
 *  - AutoMod OFFICIEL : "Alertes d'activite activees", activees par @x ;
 *  - Community Updates OFFICIEL : message d'accueil (en anglais, comme Discord).
 */

export const COMMUNITY_SYSTEM_RE = /^\[SYSTEM:COMMUNITY_(ALERTS|UPDATES)(?::([^\]]*))?\]$/;

function OfficialBadge() {
  return (
    <span className="inline-flex items-center gap-0.5 h-[15px] px-1 rounded bg-primary text-[10px] font-semibold leading-none text-white uppercase self-center">
      <Check className="w-2.5 h-2.5" strokeWidth={3} />
      Officiel
    </span>
  );
}

interface Props {
  kind: "ALERTS" | "UPDATES";
  timestamp: Date;
  timeLabel: string;
  actor: { username: string; displayName: string; avatar?: string | null };
}

export function CommunitySystemMessage({ kind, timestamp, timeLabel, actor }: Props) {
  const header = (name: string, nameCls: string) => (
    <div className="flex items-center gap-1 leading-[22px]">
      <span className={`text-base font-medium ${nameCls}`}>{name}</span>
      <OfficialBadge />
      <span className="ml-1 text-xs text-muted-foreground">{timeLabel}</span>
    </div>
  );

  if (kind === "ALERTS") {
    return (
      <div className="-mx-4 flex gap-4 px-4 py-2 mt-[17px] message-hover">
        <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-[#5865f2] to-[#3ba55c] flex items-center justify-center">
          <ShieldCheck className="w-6 h-6 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          {header("AutoMod", "text-[#a5b0ff]")}
          <div className="mt-1 pl-4">
            <p className="flex items-center gap-1.5 text-base font-semibold text-[hsl(var(--online))]">
              <ShieldCheck className="w-5 h-5" />
              Alertes d'activité activées
            </p>
            <p className="mt-1 flex items-center gap-1 text-xs text-foreground">
              Activées par
              {actor.avatar ? (
                <img src={actor.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-primary" />
              )}
              <span className="font-medium">@{actor.username}</span>
              <span className="text-muted-foreground">• {formatDistanceToNow(timestamp, { addSuffix: true, locale: fr })}</span>
            </p>
            <p className="mt-2 text-base leading-[22px] text-muted-foreground">
              Les nouvelles alertes d'activité améliorées veillent sur la sécurité de ton serveur. AutoMod enverra un
              message ici s'il y a une activité de message privé ou de connexion qui transgresse ce qui est normal pour ton
              serveur.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex gap-4 px-4 py-2 mt-[17px] message-hover">
      <div className="w-10 h-10 shrink-0 rounded-full bg-white flex items-center justify-center">
        <DiscordCommunity className="w-6 h-6 text-primary" houseClassName="fill-white" />
      </div>
      <div className="min-w-0 flex-1">
        {header("Community Updates", "text-foreground")}
        <div className="text-base leading-[22px] text-foreground whitespace-pre-line">
          {"This channel has been set up to receive official announcements for admins and moderators of Community servers. We'll let you know about important updates, such as new moderation features or changes to your server's eligibility in Server Discovery, here.\n\nYou can change which channel these messages are sent to at any time inside Server Settings. We recommend choosing your staff channel, as some information may be sensitive to your server.\n\nThanks for choosing us as the place to build your community!"}
        </div>
      </div>
    </div>
  );
}
