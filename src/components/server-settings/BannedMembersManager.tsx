import { useState } from 'react';
import { useBannedMembers, useUnbanMember } from '@/hooks/useMemberActions';
import { useServers } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
import { Search, UserX } from 'lucide-react';

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
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1">Membres bannis</h3>
        <p className="text-sm text-muted-foreground">
          {bannedMembers.length} membre{bannedMembers.length > 1 ? 's' : ''} banni{bannedMembers.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un membre banni..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Banned list */}
      <div className="space-y-1 max-h-[500px] overflow-y-auto">
        {filteredBannedMembers.map((ban) => (
          <div
            key={ban.id}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={ban.profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-destructive/20 text-destructive">
                  {ban.profile?.display_name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{ban.profile?.display_name || 'Utilisateur inconnu'}</span>
                  <UserX className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-sm text-muted-foreground">
                  @{ban.profile?.username?.toLowerCase() || 'inconnu'}
                </span>
                {ban.reason && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Raison: {ban.reason}
                  </p>
                )}
                {ban.created_at && (
                  <p className="text-xs text-muted-foreground">
                    Banni le {new Date(ban.created_at).toLocaleDateString('fr-FR')}
                  </p>
                )}
              </div>
            </div>

            {isOwner && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnbanTarget({ id: ban.user_id, name: ban.profile?.display_name || 'Utilisateur' })}
              >
                Débannir
              </Button>
            )}
          </div>
        ))}

        {filteredBannedMembers.length === 0 && (
          <div className="text-center py-12">
            <UserX className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {bannedMembers.length === 0 ? 'Aucun membre banni' : 'Aucun banni trouvé'}
            </p>
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
    </div>
  );
}
