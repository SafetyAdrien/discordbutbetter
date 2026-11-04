import { useState } from 'react';
import { useBannedMembers, useUnbanMember } from '@/hooks/useMemberActions';
import { useServers } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Gavel } from '@/components/icons/discord/lucide';
import { Search } from '@/components/icons/serverSettingsIcons';
import { SettingsEmptyState, SettingsPage } from './SettingsUI';
import { settingsInputCls } from './settingsStyles';

import { appLocale } from '@/i18n/locale';
interface BannedMembersManagerProps {
  serverId: string;
}

export function BannedMembersManager({ serverId }: BannedMembersManagerProps) {
  const { data: bannedMembers = [], isLoading } = useBannedMembers(serverId);
  const { data: servers = [] } = useServers();
  const { user } = useAuth();
  const unbanMember = useUnbanMember();
  
  const server = servers.find(s => s.id === serverId);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [unbanTarget, setUnbanTarget] = useState<{ id: string; name: string } | null>(null);

  const isOwner = server?.owner_id === user?.id;

  const handleUnban = () => {
    if (!unbanTarget) return;
    unbanMember.mutate(
      { serverId, userId: unbanTarget.id },
      { onSuccess: () => setUnbanTarget(null) }
    );
  };

  const filteredBannedMembers = bannedMembers.filter(ban =>
    ban.user_id === search.trim() ||
    ban.profile?.display_name.toLowerCase().includes(search.toLowerCase()) ||
    ban.profile?.username.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <SettingsPage
      title="Liste des bannis du serveur"
      description="Les bannissements s'appliquent au compte : un membre banni ne peut plus rejoindre le serveur, même avec une invitation."
    >
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(draft);
        }}
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Rechercher les bannissements par identifiant ou nom d'utilisateur"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (!e.target.value) setSearch('');
            }}
            className={`${settingsInputCls} pl-9`}
          />
        </div>
        <Button type="submit">Rechercher</Button>
      </form>

      <div className="mt-4 rounded-lg bg-[hsl(var(--card))] min-h-[360px]">
        {filteredBannedMembers.length === 0 ? (
          <SettingsEmptyState
            className="py-20"
            icon={<Gavel className="w-24 h-24" strokeWidth={1.25} />}
            title={bannedMembers.length === 0 ? 'Aucun bannissement' : 'Aucun résultat'}
            description={
              bannedMembers.length === 0
                ? "Tu n'as pour l'instant banni personne… mais si ça devait s'avérer nécessaire, tu ne dois pas hésiter une seule seconde !"
                : 'Aucun membre banni ne correspond à ta recherche.'
            }
          />
        ) : (
          <div className="p-2">
            {filteredBannedMembers.map((ban) => (
              <div key={ban.id} className="flex items-center gap-3 h-14 px-2 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))]">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={ban.profile?.avatar_url || undefined} />
                  <AvatarFallback>{ban.profile?.display_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-medium text-white truncate">{ban.profile?.display_name || 'Utilisateur inconnu'}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {ban.profile?.username?.toLowerCase() || 'inconnu'}
                    {ban.created_at && ` · banni le ${new Date(ban.created_at).toLocaleDateString(appLocale())}`}
                    {ban.reason && ` · ${ban.reason}`}
                  </p>
                </div>
                {isOwner && (
                  <Button size="sm" variant="secondary" onClick={() => setUnbanTarget({ id: ban.user_id, name: ban.profile?.display_name || 'Utilisateur' })}>
                    Révoquer le bannissement
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unban Confirmation Dialog */}
      <AlertDialog open={!!unbanTarget} onOpenChange={() => setUnbanTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Débannir {unbanTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre pourra à nouveau rejoindre le serveur avec une invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnban}
              className="bg-primary hover:bg-primary/90"
              disabled={unbanMember.isPending}
            >
              {unbanMember.isPending ? 'Débannissement...' : 'Débannir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  );
}
