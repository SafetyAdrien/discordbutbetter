import { useMemo, useState } from 'react';
import {
  useDownloadPermissions,
  useRemoveDownloadPermission,
  type DownloadPermissionRow,
} from '@/hooks/useDownloadPermissions';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Search, UserPlus, X, Download } from '@/components/icons/discord/lucide';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { AddDownloadPermissionModal } from './AddDownloadPermissionModal';

export function DownloadPermissionsSettings() {
  const { data: rows = [], isLoading } = useDownloadPermissions();
  const removeMutation = useRemoveDownloadPermission();
  const [query, setQuery] = useState('');
  const [addOpen, setAddOpen] = useState(false);

  const filtered = useMemo<DownloadPermissionRow[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const u = r.profile?.username?.toLowerCase() || '';
      const d = r.profile?.display_name?.toLowerCase() || '';
      return u.includes(q) || d.includes(q);
    });
  }, [rows, query]);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Download className="w-5 h-5" />
          Téléchargement de mon contenu
        </h3>
        <p className="text-sm text-muted-foreground">
          Seules les personnes ci-dessous pourront télécharger votre avatar, votre bannière et
          vos pièces jointes. Par défaut, personne n'est autorisé.
        </p>
      </div>

      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrer les personnes autorisées..."
            className="pl-9"
          />
        </div>
        <Button onClick={() => setAddOpen(true)} className="rounded-full shrink-0">
          <UserPlus className="w-4 h-4 mr-2" />
          Ajouter
        </Button>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center px-6">
            <p className="text-sm text-muted-foreground">
              Aucune personne autorisée. Personne ne peut télécharger votre contenu.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center px-6">
            <p className="text-sm text-muted-foreground">
              Aucun résultat pour "{query}".
            </p>
          </div>
        ) : (
          <ul>
            {filtered.map((row, idx) => (
              <li
                key={row.id}
                className={
                  'flex items-center gap-3 px-4 py-2.5 ' +
                  (idx > 0 ? 'border-t border-border/40' : '')
                }
              >
                <UserAvatarImage
                  src={row.profile?.avatar_url || undefined}
                  alt={row.profile?.display_name || row.profile?.username || ''}
                  fallback={
                    (row.profile?.display_name || row.profile?.username || '?')
                      .charAt(0)
                      .toUpperCase()
                  }
                  className="w-9 h-9"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {row.profile?.display_name || row.profile?.username || 'Utilisateur'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    @{row.profile?.username}
                  </p>
                </div>
                <button type="button"
                  onClick={() => removeMutation.mutate(row.id)}
                  disabled={removeMutation.isPending}
                  className="p-2 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label="Retirer de la liste"
                  title="Retirer"
                >
                  <X className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/40 rounded-xl px-3 py-2.5">
        <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
        <p>
          Cette liste empêche le téléchargement direct depuis l'application mais ne protège
          pas contre une capture d'écran ou l'enregistrement d'écran.
        </p>
      </div>

      <AddDownloadPermissionModal open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
