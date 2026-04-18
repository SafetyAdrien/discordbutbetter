import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Lock } from 'lucide-react';
import { useCreateThread } from '@/hooks/useThreads';

interface CreateThreadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string;
  messageId?: string;
  forcePublic?: boolean;
  onThreadCreated?: (threadId: string) => void;
}

const CreateThreadModal: React.FC<CreateThreadModalProps> = ({
  open,
  onOpenChange,
  channelId,
  messageId,
  forcePublic = false,
  onThreadCreated,
}) => {
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const createThread = useCreateThread();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const thread = await createThread.mutateAsync({
        channelId,
        name: name.trim(),
        messageId,
        isPrivate: forcePublic ? false : isPrivate,
      });
      setName('');
      setIsPrivate(false);
      onOpenChange(false);
      onThreadCreated?.(thread.id);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Créer un thread</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="thread-name">Nom du thread</Label>
            <Input
              id="thread-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nouveau thread..."
              maxLength={100}
              autoFocus
            />
          </div>
          {forcePublic ? (
            <p className="text-xs text-muted-foreground italic">
              Les fils créés dans un salon d'annonce sont toujours publics.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="flex items-center gap-2 min-w-0">
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">Thread privé</p>
                  <p className="text-xs text-muted-foreground">Seuls les membres invités pourront voir ce thread</p>
                </div>
              </div>
              <Switch
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || createThread.isPending}
            >
              {createThread.isPending ? 'Création...' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateThreadModal;
