import { useState } from 'react';
import { useMembers } from '@/hooks/useMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Shield, UserMinus, Ban, Crown } from 'lucide-react';
import { useServers } from '@/hooks/useServers';
import { useAuth } from '@/contexts/AuthContext';

interface MemberManagerProps {
  serverId: string;
}

export function MemberManager({ serverId }: MemberManagerProps) {
  const { data: members = [], isLoading } = useMembers(serverId);
  const { data: servers = [] } = useServers();
  const { user } = useAuth();
  
  const server = servers.find(s => s.id === serverId);
  const [search, setSearch] = useState('');

  const filteredMembers = members.filter(member => 
    member.user.display_name.toLowerCase().includes(search.toLowerCase()) ||
    member.user.username.toLowerCase().includes(search.toLowerCase())
  );

  const isOwner = server?.owner_id === user?.id;

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
        <h3 className="text-lg font-semibold mb-1">Membres du serveur</h3>
        <p className="text-sm text-muted-foreground">
          {members.length} membre{members.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un membre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

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
                      <Crown className="w-4 h-4 text-yellow-500" />
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
                      <DropdownMenuItem className="text-yellow-500">
                        <UserMinus className="w-4 h-4 mr-2" />
                        Expulser
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
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
    </div>
  );
}
