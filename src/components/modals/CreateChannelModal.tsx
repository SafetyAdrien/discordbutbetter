import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { StreamlineHash } from "@/components/icons/StreamlineHash";
import { StreamlineVoice } from "@/components/icons/StreamlineVoice";
import { StreamlineForum } from "@/components/icons/StreamlineForum";
import { StreamlineMegaphone } from "@/components/icons/StreamlineMegaphone";
import { StreamlineMedia } from "@/components/icons/StreamlineMedia";
import { StreamlineCalendar } from "@/components/icons/StreamlineCalendar";
import { StreamlineTasks } from "@/components/icons/StreamlineTasks";
import { StreamlineStage } from "@/components/icons/StreamlineStage";
import { useCreateChannel, ChannelType } from "@/hooks/useChannels";
import { useServerSettings } from "@/hooks/useServerSettings";

function formatStrictChannelName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u00C0-\u024F-_]/g, '');
}

interface CreateChannelModalProps {
  serverId: string;
  categoryId: string | null;
  categoryName: string;
  categories?: { id: string; name: string }[];
  showCategorySelector?: boolean;
  onClose: () => void;
}

const channelTypes: { value: ChannelType; label: string; icon: React.ElementType; description: string }[] = [
  {
    value: "text",
    label: "Texte",
    icon: StreamlineHash,
    description: "Partage des images, des GIF, des émojis, des opinions et des blagues.",
  },
  {
    value: "voice",
    label: "Vocal",
    icon: StreamlineVoice,
    description: "Rejoins tes amis en vocal, en vidéo et avec le partage d'écran.",
  },
  {
    value: "stage",
    label: "Conférence",
    icon: StreamlineStage,
    description: "Organise des évènements, des groupes et des sessions de questions-réponses en public.",
  },
  {
    value: "forum",
    label: "Forum",
    icon: StreamlineForum,
    description: "Créer un espace pour organiser des sujets de discussions.",
  },
  {
    value: "announcement",
    label: "Annonce",
    icon: StreamlineMegaphone,
    description: "Récapitulatif pour les personnes qui entrant et sortant du serveur.",
  },
  {
    value: "media",
    label: "Contenu multimédia",
    icon: StreamlineMedia,
    description: "Partage des vidéos, des photos et des fichiers avec les membres de ton serveur.",
  },
  {
    value: "calendar",
    label: "Calendrier",
    icon: StreamlineCalendar,
    description: "Planifiez et programmez des événements.",
  },
  {
    value: "tasks",
    label: "Tâches",
    icon: StreamlineTasks,
    description: "Créer et gère ta liste de tâche à accomplir sur ton serveur.",
  },
];

export function CreateChannelModal({
  serverId,
  categoryId,
  categoryName,
  onClose,
}: CreateChannelModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType>("text");
  const createChannel = useCreateChannel();
  const { data: serverSettings } = useServerSettings(serverId);
  
  const isFlexible = serverSettings?.flexible_channel_names ?? true;
  const isExemptFromStrict = type === 'voice' || type === 'stage';
  const shouldFormatStrict = !isFlexible && !isExemptFromStrict;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalName = shouldFormatStrict ? formatStrictChannelName(name.trim()) : name.trim();
    if (!finalName) return;

    createChannel.mutate({ serverId, categoryId, name: finalName, type }, { onSuccess: onClose });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-lg"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Créer un salon</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {categoryId ? `Dans ${categoryName}` : "Sans catégorie"}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Type de salon</Label>
            <RadioGroup 
              value={type} 
              onValueChange={(value) => setType(value as ChannelType)} 
              className="grid grid-cols-2 gap-3"
            >
              {channelTypes.map((channelType) => {
                const Icon = channelType.icon;
                return (
                  <label
                    key={channelType.value}
                    className={`flex flex-col gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      type === channelType.value ? "border-[#5865f2] bg-[#5865f2]/10" : "border-border hover:bg-muted"
                    }`}
                  >
                    <RadioGroupItem value={channelType.value} className="sr-only" />
                    <div className="flex items-center gap-2">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <p className="font-medium text-sm">{channelType.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{channelType.description}</p>
                  </label>
                );
              })}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom du salon</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={shouldFormatStrict ? "nouveau-salon" : "Nouveau salon"}
              autoFocus
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createChannel.isPending}
              className="bg-[#5865f2] hover:bg-[#5865f2]/90"
            >
              {createChannel.isPending ? "Création..." : "Créer le salon"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
