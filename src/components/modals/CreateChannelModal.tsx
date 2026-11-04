import { useEffect, useRef, useState } from "react";
import { Smile } from "@/components/icons/discord/lucide";
import { ResponsiveModal } from "@/components/ui/responsive-modal";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { EmojiStickerPicker } from "@/components/chat/EmojiStickerPicker";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import { StreamlineVoice } from "@/components/icons/StreamlineVoice";
import { StreamlineForum } from "@/components/icons/StreamlineForum";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";
import { StreamlineMedia } from "@/components/icons/StreamlineMedia";
import { StreamlineCalendar } from "@/components/icons/StreamlineCalendar";
import { StreamlineTasks } from "@/components/icons/StreamlineTasks";
import { StreamlineStage } from "@/components/icons/StreamlineStage";
import { StreamlineLink } from "@/components/icons/StreamlineLink";
import { useCreateChannel, ChannelType } from "@/hooks/useChannels";
import { useServerSettings } from "@/hooks/useServerSettings";
import { isChannelTypeAvailable } from "@/lib/channelTypeAvailability";
import { ChannelSheetIcon } from "@/components/icons/ChannelSheetIcon";
import { useServerRoles } from "@/hooks/useRoles";
import { useSetPermissionOverride } from "@/hooks/useChannelPermissions";
import { cn } from "@/lib/utils";

function formatStrictChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}\p{Emoji_Presentation}\p{So}・\-_]/gu, '');
}

interface CreateChannelModalProps {
  serverId: string;
  categoryId: string | null;
  categoryName: string;
  categories?: { id: string; name: string }[];
  showCategorySelector?: boolean;
  /** Type preselectionne (ex. "Creer un salon de conference" depuis un evenement). */
  initialType?: ChannelType;
  onClose: () => void;
  onCreated?: (channel: { id: string; name: string; type: ChannelType }) => void;
}

/*
 * Types de salon. Les cinq premiers reprennent la fenetre "Creer un salon"
 * de Discord (ordre et textes de la video de reference) ; les suivants sont
 * les types propres a l'app. Hors communaute, seuls Texte, Vocal, Forum et
 * Lien sont proposes (src/lib/channelTypeAvailability.ts).
 */
const channelTypes: { value: ChannelType; label: string; icon: React.ElementType; description: string; placeholder: string }[] = [
  {
    value: "text",
    label: "Texte",
    icon: StreamlineHash,
    description: "Partage des images, des GIF, des émojis, des opinions et des blagues",
    placeholder: "nouveau-salon",
  },
  {
    value: "voice",
    label: "Vocal",
    icon: StreamlineVoice,
    description: "Rejoins tes amis en vocal, en vidéo et avec le partage d'écran",
    placeholder: "Nouveau salon",
  },
  {
    value: "forum",
    label: "Forum",
    icon: StreamlineForum,
    description: "Créer un espace pour organiser des discussions",
    placeholder: "forum-discussion",
  },
  {
    value: "announcement",
    label: "Annonce",
    icon: StreamlineMegaphone,
    description: "Récapitulatif pour les personnes qui entrent et sortent du serveur",
    placeholder: "nouveau-salon",
  },
  {
    value: "stage",
    label: "Conférence",
    icon: StreamlineStage,
    description: "Organise des événements, des groupes et des sessions de questions-réponses en public",
    placeholder: "Nouveau salon",
  },
  {
    value: "media",
    label: "Contenu multimédia",
    icon: StreamlineMedia,
    description: "Partage des vidéos, des photos et des fichiers avec les membres de ton serveur",
    placeholder: "nouveau-salon",
  },
  {
    value: "calendar",
    label: "Calendrier",
    icon: StreamlineCalendar,
    description: "Planifie et programme des événements",
    placeholder: "calendrier",
  },
  {
    value: "tasks",
    label: "Tâches",
    icon: StreamlineTasks,
    description: "Crée et gère la liste des tâches à accomplir sur ton serveur",
    placeholder: "taches",
  },
  {
    value: "link",
    label: "Chaîne de liaison",
    icon: StreamlineLink,
    description: "Ajoute un lien externe qui redirige vers un site ou une ressource",
    placeholder: "new-channel",
  },
];

/** Un salon d'annonces est public par nature (il peut etre suivi). */
const supportsPrivate = (type: ChannelType) => type !== "announcement" && type !== "link";

export function CreateChannelModal({
  serverId,
  categoryId: initialCategoryId,
  categoryName,
  categories,
  showCategorySelector = false,
  initialType,
  onClose,
  onCreated,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType>(initialType ?? "text");
  const [linkUrl, setLinkUrl] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(initialCategoryId);
  const createChannel = useCreateChannel();
  const setOverride = useSetPermissionOverride();
  const { data: serverSettings } = useServerSettings(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus sans defilement : `autoFocus` faisait defiler la liste des types
  // jusqu'au champ et masquait les premiers types.
  useEffect(() => {
    const t = setTimeout(() => nameInputRef.current?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(t);
  }, []);

  const isFlexible = serverSettings?.flexible_channel_names ?? true;
  const isExemptFromStrict = type === 'voice' || type === 'stage';
  const shouldFormatStrict = !isFlexible && !isExemptFromStrict;

  const isLink = type === 'link';
  const isValidUrl = /^https?:\/\/.+/.test(linkUrl.trim());
  // Serveur classique : Texte, Vocal, Forum et Lien ; le reste demande la communaute.
  const community = !!serverSettings?.community_enabled;
  const availableTypes = channelTypes.filter((t) => isChannelTypeAvailable(t.value, community));
  useEffect(() => {
    if (serverSettings && !isChannelTypeAvailable(type, community)) setType('text');
  }, [serverSettings, community, type]);
  const selected = availableTypes.find((t) => t.value === type) ?? availableTypes[0];
  const SelectedIcon = selected.icon;
  const currentCategoryName = categoryId
    ? categories?.find((c) => c.id === categoryId)?.name ?? categoryName
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (isLink && !isValidUrl) return;

    const finalName = shouldFormatStrict ? formatStrictChannelName(name.trim()) : name.trim();
    if (!finalName) return;

    createChannel.mutate(
      { serverId, categoryId, name: finalName, type, ...(isLink ? { description: linkUrl.trim() } : {}) },
      {
        onSuccess: (created) => {
          // Salon prive : on retire la vue du salon a @everyone. Le
          // proprietaire et les administrateurs le voient toujours.
          const everyone = roles.find((r) => r.is_default);
          if (isPrivate && supportsPrivate(type) && everyone && created?.id) {
            setOverride.mutate({ channelId: created.id, roleId: everyone.id, permission: 'view_channel', type: 'deny' });
          }
          if (created?.id) onCreated?.({ id: created.id, name: finalName, type });
          onClose();
        },
      }
    );
  };

  return (
    <ResponsiveModal
      open={true}
      onOpenChange={(open) => !open && onClose()}
      title="Créer un salon"
      className="sm:max-w-[460px] p-0 gap-0 overflow-hidden"
      headerClassName="px-6 pt-6 pb-2 text-left"
    >
      <form onSubmit={handleSubmit} className="flex flex-col max-h-[80vh]">
        <div className="px-4 sm:px-6 pb-4 overflow-y-auto scrollbar-thin">
          {showCategorySelector && categories && categories.length > 0 ? (
            <select
              aria-label="Catégorie"
              value={categoryId ?? ''}
              onChange={(e) => setCategoryId(e.target.value || null)}
              className="-mt-1 mb-4 h-8 rounded-md bg-[hsl(var(--search-background))] border border-white/[0.06] px-2 text-xs text-muted-foreground"
            >
              <option value="">Sans catégorie</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{`dans ${cat.name}`}</option>
              ))}
            </select>
          ) : (
            <p className="-mt-1 mb-4 text-xs text-muted-foreground">
              {currentCategoryName ? `dans ${currentCategoryName}` : "Sans catégorie"}
            </p>
          )}

          <p className="mb-2 text-base font-semibold text-foreground">Type de salon</p>
          <RadioGroup
            value={type}
            onValueChange={(value) => setType(value as ChannelType)}
            className="gap-1"
          >
            {availableTypes.map((channelType) => {
              const Icon = channelType.icon;
              const active = type === channelType.value;
              return (
                <label
                  key={channelType.value}
                  className={cn(
                    "flex items-start gap-3 px-2 py-2 -mx-2 rounded-lg cursor-pointer transition-colors",
                    active ? "bg-[hsl(var(--interactive-background-hover))]" : "hover:bg-[hsl(var(--interactive-background-hover))]",
                  )}
                >
                  <RadioGroupItem
                    value={channelType.value}
                    className="mt-0.5 h-5 w-5 shrink-0 border-2 border-[hsl(var(--header-icon))] text-white data-[state=checked]:border-white"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-base font-medium text-foreground leading-5">
                      <Icon className="w-5 h-5 shrink-0" />
                      {channelType.label}
                    </span>
                    <span className="block mt-0.5 text-sm leading-[18px] text-muted-foreground">
                      {channelType.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </RadioGroup>

          <label htmlFor="channel-name" className="block mt-5 mb-2 text-base font-semibold text-foreground">
            Nom du salon
          </label>
          <div className="flex items-center gap-2 h-11 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus-within:border-primary transition-colors">
            <SelectedIcon className="w-4 h-4 shrink-0 text-foreground" />
            <input
              id="channel-name"
              ref={nameInputRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={selected.placeholder}
              className="flex-1 min-w-0 bg-transparent text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none"
            />
            <EmojiStickerPicker
              serverId={serverId}
              onEmojiSelect={(emoji) => setName((n) => n + emoji)}
              trigger={
                <button type="button" aria-label="Ajouter un émoji" className="shrink-0 text-[hsl(var(--icon-default))] hover:text-white transition-colors">
                  <Smile className="w-5 h-5" />
                </button>
              }
            />
          </div>

          {isLink && (
            <>
              <label htmlFor="link-url" className="block mt-4 mb-2 text-base font-semibold text-foreground">
                URL
              </label>
              <input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                type="url"
                className="w-full h-11 px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] focus:border-primary text-base text-foreground placeholder:text-[hsl(var(--text-placeholder))] outline-none transition-colors"
              />
              {linkUrl && !isValidUrl && (
                <p className="mt-1 text-xs text-destructive">L'URL doit commencer par http:// ou https://</p>
              )}
            </>
          )}

          {type === "announcement" ? (
            <p className="mt-4 text-sm leading-[18px] text-muted-foreground">
              Les utilisateurs peuvent suivre ce salon sur leurs propres serveurs. Les posts que tu
              « publies » dans ce salon apparaîtront sur ces serveurs.
            </p>
          ) : supportsPrivate(type) ? (
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-1.5 text-base font-semibold text-foreground">
                  <ChannelSheetIcon name="lock" className="w-4 h-4" />
                  Salon privé
                </p>
                <p className="mt-0.5 text-sm leading-[18px] text-muted-foreground">
                  Seuls les membres et rôles sélectionnés pourront voir ce salon.
                </p>
              </div>
              <Switch checked={isPrivate} onCheckedChange={setIsPrivate} aria-label="Salon privé" />
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 sm:px-6 py-4 bg-[hsl(var(--card))]">
          <Button type="button" variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={!name.trim() || createChannel.isPending || (isLink && !isValidUrl)}
          >
            {createChannel.isPending ? "Création..." : "Créer un salon"}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
