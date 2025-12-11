import { useState } from 'react';
import { useServerInvites, useCreateInvite, useDeleteInvite } from '@/hooks/useInvites';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Copy, Trash2, Link, Plus, Loader2, Clock, Users } from 'lucide-react';
import { copyToClipboard } from '@/lib/clipboard';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface InviteManagerProps {
  serverId: string;
}

const EXPIRE_OPTIONS = [
  { value: '1', label: '1 heure' },
  { value: '24', label: '24 heures' },
  { value: '168', label: '7 jours' },
  { value: '720', label: '30 jours' },
  { value: 'never', label: 'Jamais' },
];

const MAX_USES_OPTIONS = [
  { value: 'unlimited', label: 'Illimité' },
  { value: '1', label: '1 utilisation' },
  { value: '5', label: '5 utilisations' },
  { value: '10', label: '10 utilisations' },
  { value: '25', label: '25 utilisations' },
  { value: '50', label: '50 utilisations' },
  { value: '100', label: '100 utilisations' },
];

export function InviteManager({ serverId }: InviteManagerProps) {
  const { data: invites = [], isLoading } = useServerInvites(serverId);
  const createInvite = useCreateInvite();
  const deleteInvite = useDeleteInvite();

  const [showCreate, setShowCreate] = useState(false);
  const [expireIn, setExpireIn] = useState('24');
  const [maxUses, setMaxUses] = useState('unlimited');

  const handleCreate = () => {
    createInvite.mutate(
      {
        serverId,
        expiresIn: expireIn === 'never' ? undefined : parseInt(expireIn),
        maxUses: maxUses === 'unlimited' ? undefined : parseInt(maxUses),
        isPermanent: expireIn === 'never',
      },
      {
        onSuccess: () => setShowCreate(false),
      }
    );
  };

  const handleCopy = (code: string) => {
    const link = `${window.location.origin}/invite/${code}`;
    copyToClipboard(link, 'Lien d\'invitation copié !');
  };

  const getExpiryText = (invite: typeof invites[0]) => {
    if (invite.is_permanent) return 'Permanent';
    if (!invite.expires_at) return 'Permanent';
    const date = new Date(invite.expires_at);
    if (date < new Date()) return 'Expiré';
    return format(date, 'PPP à HH:mm', { locale: fr });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Invitations</h3>
          <p className="text-sm text-muted-foreground">
            Gérez les liens d'invitation de votre serveur
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Créer une invitation
        </Button>
      </div>

      {showCreate && (
        <div className="p-4 bg-muted/50 rounded-lg space-y-4">
          <h4 className="font-medium">Nouvelle invitation</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expire après</Label>
              <Select value={expireIn} onValueChange={setExpireIn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nombre d'utilisations max</Label>
              <Select value={maxUses} onValueChange={setMaxUses}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAX_USES_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} disabled={createInvite.isPending}>
              {createInvite.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {invites.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Link className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>Aucune invitation active</p>
          </div>
        ) : (
          invites.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center gap-4 p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono bg-background px-2 py-0.5 rounded">
                    {invite.code}
                  </code>
                  <Button
                    size="iconSm"
                    variant="ghost"
                    onClick={() => handleCopy(invite.code)}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getExpiryText(invite)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {invite.uses}{invite.max_uses ? `/${invite.max_uses}` : ''} utilisations
                  </span>
                </div>
              </div>

              {invite.creator && (
                <div className="flex items-center gap-2">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={invite.creator.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {invite.creator.display_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm text-muted-foreground">
                    {invite.creator.display_name}
                  </span>
                </div>
              )}

              <Button
                size="iconSm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => deleteInvite.mutate({ inviteId: invite.id, serverId })}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
