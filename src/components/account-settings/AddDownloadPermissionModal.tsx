import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Search, Loader2 } from 'lucide-react';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import {
  useSearchDownloadableCandidates,
  useAddDownloadPermission,
} from '@/hooks/useDownloadPermissions';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDownloadPermissionModal({ open, onOpenChange }: Props) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 200);
  const { data: candidates = [], isLoading } = useSearchDownloadableCandidates(debounced);
  const addMutation = useAddDownloadPermission();

  const handlePick = async (userId: string) => {
    try {
      await addMutation.mutateAsync(userId);
      onOpenChange(false);
      setQuery('');
    } catch {
      // toast already shown
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setQuery('');
      }}
    >
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Autoriser une personne à télécharger</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher parmi vos amis et serveurs..."
            className="pl-9"
            autoFocus
          />
        </div>

        <p className="text-xs text-muted-foreground -mt-2">
          La recherche est limitée à vos amis et aux membres des serveurs que vous partagez.
        </p>

        <div className="max-h-[320px] overflow-y-auto -mx-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {debounced
                ? 'Aucun résultat parmi vos amis et serveurs.'
                : 'Tapez un nom pour rechercher.'}
            </p>
          ) : (
            <ul className="space-y-0.5 px-2">
              {candidates.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => handlePick(c.id)}
                    disabled={addMutation.isPending}
                    className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted transition-colors text-left disabled:opacity-50"
                  >
                    <UserAvatarImage
                      src={c.avatar_url || undefined}
                      alt={c.display_name || c.username}
                      fallback={(c.display_name || c.username)?.charAt(0).toUpperCase() || '?'}
                      className="w-9 h-9"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {c.display_name || c.username}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">@{c.username}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
