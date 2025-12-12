import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Hash,
  Volume2,
  MessageCircleMore,
  Image,
  CalendarDays,
  ListTodo,
} from 'lucide-react';
import { StreamlineMegaphone } from '@/components/icons/StreamlineMegaphone';
import { useCreateChannel, ChannelType } from '@/hooks/useChannels';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateChannelModalProps {
  serverId: string;
  categoryId: string | null;
  categoryName: string;
  categories?: { id: string; name: string }[];
  showCategorySelector?: boolean;
  onClose: () => void;
}

const channelTypes: { value: ChannelType; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'text', label: 'Textuel', icon: Hash, description: 'Envoyer des messages' },
  { value: 'voice', label: 'Vocal', icon: Volume2, description: 'Parler en temps réel' },
  { value: 'forum', label: 'Forum', icon: MessageCircleMore, description: 'Discussions organisées' },
  { value: 'announcement', label: 'Annonce', icon: StreamlineMegaphone, description: 'Messages importants' },
  { value: 'media', label: 'Médias', icon: Image, description: 'Partager des images/vidéos' },
  { value: 'calendar', label: 'Calendrier', icon: CalendarDays, description: 'Événements et rendez-vous' },
  { value: 'tasks', label: 'Tâches', icon: ListTodo, description: 'Liste de tâches' },
];

export function CreateChannelModal({
  serverId,
  categoryId,
  categoryName,
  categories,
  showCategorySelector,
  onClose,
}: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<ChannelType>('text');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(categoryId);
  const createChannel = useCreateChannel();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createChannel.mutate(
      { serverId, categoryId: selectedCategoryId, name: name.trim(), type },
      { onSuccess: onClose }
    );
  };

  const displayCategoryName = showCategorySelector
    ? (selectedCategoryId ? categories?.find(c => c.id === selectedCategoryId)?.name || 'Sans catégorie' : 'Sans catégorie')
    : categoryName;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un salon</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {selectedCategoryId ? `Dans ${displayCategoryName}` : 'Sans catégorie'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {showCategorySelector && categories && (
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select 
                value={selectedCategoryId || 'none'} 
                onValueChange={(value) => setSelectedCategoryId(value === 'none' ? null : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sans catégorie</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Nom du salon</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="nouveau-salon"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Type de salon</Label>
            <RadioGroup
              value={type}
              onValueChange={(value) => setType(value as ChannelType)}
              className="grid gap-2"
            >
              {channelTypes.map((channelType) => {
                const Icon = channelType.icon;
                return (
                  <label
                    key={channelType.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      type === channelType.value
                        ? 'border-[#5865f2] bg-[#5865f2]/10'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <RadioGroupItem value={channelType.value} className="sr-only" />
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{channelType.label}</p>
                      <p className="text-xs text-muted-foreground">{channelType.description}</p>
                    </div>
                  </label>
                );
              })}
            </RadioGroup>
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
              {createChannel.isPending ? 'Création...' : 'Créer le salon'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
