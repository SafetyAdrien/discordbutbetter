import { useState } from 'react';
import { useSendFriendRequest } from '@/hooks/useFriends';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, UserPlus, Loader2 } from 'lucide-react';

interface AddFriendModalProps {
  onClose: () => void;
}

export function AddFriendModal({ onClose }: AddFriendModalProps) {
  const [username, setUsername] = useState('');
  const sendRequest = useSendFriendRequest();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    await sendRequest.mutateAsync(username.trim());
    if (!sendRequest.isError) {
      setUsername('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md glass rounded-xl p-6 m-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-xl font-semibold">Ajouter un ami</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Entrez le nom d'utilisateur de la personne que vous souhaitez ajouter
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Nom d'utilisateur</Label>
            <Input
              id="username"
              placeholder="gamerpro42"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Le nom d'utilisateur est affiché avec @ (ex: @gamerpro42)
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!username.trim() || sendRequest.isPending}
            >
              {sendRequest.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
