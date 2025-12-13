import { useState } from 'react';
import { useMembers } from '@/hooks/useMembers';
import { useKickMember, useBanMember, useBannedMembers, useUnbanMember } from '@/hooks/useMemberActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Search, MoreVertical, Shield, UserMinus, Ban, UserX } from 'lucide-react';
import { StreamlineCrown } from '@/components/icons/StreamlineCrown';
import { useServers } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';

interface MemberManagerProps {
  serverId: string;
}

export function MemberManager({ serverId }: MemberManagerProps) {
  const { data: members = [], isLoading } = useMembers(serverId);
  const { data: bannedMembers = [], isLoading: bannedLoading } = useBannedMembers(serverId);
  const { data: servers = [] } = useServers();
  const { user } = useAuth();
  const kickMember = useKickMember();
  const banMember = useBanMember();
  const unbanMember = useUnbanMember();
  
  const server = servers.find(s => s.id === serverId);
  const [search, setSearch] = useState('');
  const [kickTarget, setKickTarget] = useState<{ id: string; name: string } | null>(null);
  const [banTarget, setBanTarget] = useState<{ id: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [unbanTarget, setUnbanTarget] = useState<{ id: string; name: string } | null>(null);

  const filteredMembers = members.filter(member => 
    member.user.display_name.toLowerCase().includes(search.toLowerCase()) ||
    member.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const isOwner = server?.owner_id === user?.id;

  const handleKick = () => {
    if (!kickTarget) return;
    kickMember.mutate(
      { serverId, userId: kickTarget.id },
      { onSuccess: () => setKickTarget(null) }
    );
  };

  const handleBan = () => {
    if (!banTarget) return;
    banMember.mutate(
      { serverId, userId: banTarget.id, reason: banReason || undefined },
      { onSuccess: () => { setBanTarget(null); setBanReason(''); } }
    );
  };

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
        <h3 className="text-lg font-semibold mb-1">Gestion des membres</h3>
        <p className="text-sm text-muted-foreground">
          {members.length} membre{members.length > 1 ? 's' : ''} • {bannedMembers.length} banni{bannedMembers.length > 1 ? 's' : ''}
        </p>
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="members" className="flex-1">Membres ({members.length})</TabsTrigger>
          <TabsTrigger value="banned" className="flex-1">Bannis ({bannedMembers.length})</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="members" className="mt-0">
          {/* Member list */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
        {filteredMembers.map((member) => {
          const isMemberOwner = member.user.id === server?.owner_id;
          
          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={member.user.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {member.user.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{member.user.display_name}</span>
                    {isMemberOwner && (
                      <StreamlineCrown size={16} className="text-yellow-500" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    @{member.user.username.toLowerCase()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Role badges */}
                <div className="flex gap-1">
                  {member.roles?.slice(0, 2).map((role) => (
                    <Badge
                      key={role.id}
                      variant="outline"
                      className="text-xs"
                      style={{ borderColor: role.color || undefined, color: role.color || undefined }}
                    >
                      {role.name}
                    </Badge>
                  ))}
                  {(member.roles?.length || 0) > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{(member.roles?.length || 0) - 2}
                    </Badge>
                  )}
                </div>

                {/* Actions menu */}
                {isOwner && !isMemberOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Shield className="w-4 h-4 mr-2" />
                        Gérer les rôles
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-yellow-500"
                        onClick={() => setKickTarget({ id: member.user.id, name: member.user.display_name })}
                      >
                        <UserMinus className="w-4 h-4 mr-2" />
                        Expulser
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setBanTarget({ id: member.user.id, name: member.user.display_name })}
                      >
                        <Ban className="w-4 h-4 mr-2" />
                        Bannir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          );
        })}

            {filteredMembers.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Aucun membre trouvé
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="banned" className="mt-0">
          {/* Banned list */}
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
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
              <p className="text-center text-muted-foreground py-8">
                {bannedMembers.length === 0 ? 'Aucun membre banni' : 'Aucun banni trouvé'}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Kick Confirmation Dialog */}
      <AlertDialog open={!!kickTarget} onOpenChange={() => setKickTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Expulser {kickTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre sera retiré du serveur mais pourra rejoindre à nouveau avec une invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleKick}
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={kickMember.isPending}
            >
              {kickMember.isPending ? 'Expulsion...' : 'Expulser'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ban Confirmation Dialog */}
      <AlertDialog open={!!banTarget} onOpenChange={() => { setBanTarget(null); setBanReason(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bannir {banTarget?.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Ce membre sera définitivement exclu du serveur et ne pourra plus le rejoindre.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Raison du bannissement (optionnel)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBan}
              className="bg-destructive hover:bg-destructive/90"
              disabled={banMember.isPending}
            >
              {banMember.isPending ? 'Bannissement...' : 'Bannir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
