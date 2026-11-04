import { useMemo, useState } from 'react';
import { Search } from '@/components/icons/discord/lucide';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { inviteExpiryLabel, useCreateInvite, useDefaultInviteCode } from '@/hooks/useInvites';
import { useServers } from '@/hooks/useServers';
import { useFriends } from '@/hooks/useFriends';
import { useCreateDMConversation } from '@/hooks/useDMs';
import { useSendDMMessage } from '@/hooks/useDMMessages';
import { copyToClipboard } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import { settingsInputCls } from '@/components/server-settings/settingsStyles';

interface CreateInviteModalProps {
  serverId: string;
  channelName?: string;
  /** Partage d'un evenement : le lien porte `?event=<id>`. */
  event?: { id: string; locationLabel: string };
  onClose: () => void;
}

/*
 * "Inviter des amis sur <serveur>" (video de reference) : liste d'amis avec
 * un bouton "Inviter" qui leur envoie le lien en message prive, puis le lien
 * a copier. Le lien par defaut (7 jours, illimite) est reutilise s'il en
 * existe deja un valide ; "Modifier le lien d'invitation" ouvre les
 * parametres et genere un nouveau lien.
 */

const EXPIRE_OPTIONS = [
  { value: '0.5', label: '30 minutes' },
  { value: '1', label: '1 heure' },
  { value: '6', label: '6 heures' },
  { value: '12', label: '12 heures' },
  { value: '24', label: '1 jour' },
  { value: '168', label: '7 jours' },
  { value: '720', label: '30 jours' },
  { value: 'never', label: 'Jamais' },
];

const MAX_USES_OPTIONS = [
  { value: '', label: 'Illimité' },
  { value: '1', label: '1 utilisation' },
  { value: '5', label: '5 utilisations' },
  { value: '10', label: '10 utilisations' },
  { value: '25', label: '25 utilisations' },
  { value: '50', label: '50 utilisations' },
  { value: '100', label: '100 utilisations' },
];

export function CreateInviteModal({ serverId, channelName, event, onClose }: CreateInviteModalProps) {
  const { data: servers = [] } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const { code, expiresAt, setInvite } = useDefaultInviteCode(serverId);
  const { data: friends = [] } = useFriends();
  const createInvite = useCreateInvite();
  const createDM = useCreateDMConversation();
  const sendDM = useSendDMMessage();

  const [copied, setCopied] = useState(false);
  const [query, setQuery] = useState('');
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'invite' | 'settings'>('invite');
  const [expireIn, setExpireIn] = useState('168');
  const [maxUses, setMaxUses] = useState('');
  const link = code ? `${window.location.origin}/invite/${code}${event ? `?event=${event.id}` : ''}` : '';

  const acceptedFriends = useMemo(
    () =>
      friends
        .filter((f) => f.status === 'accepted')
        .filter((f) => {
          const q = query.trim().toLowerCase();
          return !q || f.profile.display_name.toLowerCase().includes(q) || f.profile.username.toLowerCase().includes(q);
        }),
    [friends, query],
  );

  const handleCopy = () => {
    if (!link) return;
    copyToClipboard(link, 'Lien copié !');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async (friendUserId: string) => {
    if (!link || invited.has(friendUserId)) return;
    setInvited((s) => new Set(s).add(friendUserId));
    try {
      const { conversation_id } = await createDM.mutateAsync(friendUserId);
      await sendDM.mutateAsync({ conversationId: conversation_id, content: link });
    } catch {
      setInvited((s) => {
        const next = new Set(s);
        next.delete(friendUserId);
        return next;
      });
    }
  };

  const generate = () => {
    const never = expireIn === 'never';
    createInvite.mutate(
      {
        serverId,
        expiresIn: never ? undefined : Number(expireIn),
        maxUses: maxUses ? Number(maxUses) : undefined,
        isPermanent: never,
      },
      {
        onSuccess: (data) => {
          setInvite({ code: data.code, expiresAt: data.expires_at ?? null });
          setView('invite');
        },
      },
    );
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-0 gap-0 overflow-hidden">
        {view === 'invite' ? (
          <>
            <div className="px-4 pt-4">
              <DialogTitle className="text-xl font-semibold text-white pr-8 truncate">
                {event ? "Invite des amis à rejoindre l'événement" : `Inviter des amis sur ${server?.name ?? 'ce serveur'}`}
              </DialogTitle>
              {event ? (
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Les destinataires iront dans <span className="text-foreground">{event.locationLabel}</span>
                </DialogDescription>
              ) : channelName && (
                <DialogDescription className="mt-1 text-sm text-muted-foreground">
                  Les destinataires iront dans <span className="text-foreground"># {channelName}</span>
                </DialogDescription>
              )}
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher des amis" className={cn(settingsInputCls, 'pl-9 h-9 text-sm')} />
              </div>
            </div>

            <div className="h-[300px] overflow-y-auto scrollbar-thin px-2 py-2 border-b border-border">
              {acceptedFriends.length === 0 ? (
                <p className="h-full flex items-center justify-center text-center text-base font-semibold text-muted-foreground px-6">
                  {friends.length === 0 ? "Tu n'as pas encore d'amis à inviter." : 'Aucun ami ne correspond.'}
                </p>
              ) : (
                acceptedFriends.map((f) => {
                  const done = invited.has(f.profile.id);
                  return (
                    <div key={f.id} className="flex items-center gap-3 h-11 px-2 rounded-lg hover:bg-[hsl(var(--interactive-background-hover))]">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={f.profile.avatar_url ?? undefined} />
                        <AvatarFallback>{f.profile.display_name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 leading-tight">
                        <p className="text-sm font-medium text-white truncate">{f.profile.display_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{f.profile.username}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={done ? 'ghost' : 'secondary'}
                        disabled={!link || done}
                        onClick={() => handleInvite(f.profile.id)}
                        className={cn('h-8 min-w-[72px]', !done && 'border border-[hsl(var(--online))] bg-transparent hover:bg-[hsl(var(--online))] text-white')}
                      >
                        {done ? 'Envoyé' : 'Inviter'}
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="px-4 py-4 bg-[hsl(var(--card))]">
              <p className="mb-2 text-sm font-semibold text-white">
                {event ? "Ou sinon, envoie un lien d'invitation à un événement à un ami" : "Ou envoyer un lien d'invitation à un ami"}
              </p>
              <div className="flex items-center gap-2 p-1 pl-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06]">
                <input readOnly value={link || 'Création du lien…'} className="flex-1 min-w-0 bg-transparent text-sm text-foreground outline-none" />
                <Button size="sm" onClick={handleCopy} disabled={!link} className={cn('h-8 min-w-[72px]', copied && 'bg-[#248046] hover:bg-[#248046]')}>
                  {copied ? 'Copié' : 'Copier'}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {code ? inviteExpiryLabel(expiresAt) : ' '}{' '}
                <button type="button" onClick={() => setView('settings')} className="text-[hsl(var(--text-link))] hover:underline">
                  Modifier le lien d'invitation.
                </button>
              </p>
            </div>
          </>
        ) : (
          <div className="p-4">
            <DialogTitle className="text-xl font-semibold text-white pr-8">Paramètres des liens d'invitation au serveur</DialogTitle>
            <DialogDescription className="sr-only">Durée et nombre d'utilisations du lien</DialogDescription>
            <label className="block mt-5 mb-2 text-xs font-semibold text-foreground">Expire après</label>
            <select value={expireIn} onChange={(e) => setExpireIn(e.target.value)} className={settingsInputCls}>
              {EXPIRE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <label className="block mt-4 mb-2 text-xs font-semibold text-foreground">Nombre maximum d'utilisations</label>
            <select value={maxUses} onChange={(e) => setMaxUses(e.target.value)} className={settingsInputCls}>
              {MAX_USES_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <div className="mt-5 flex items-start justify-between gap-4 opacity-60">
              <div>
                <p className="text-sm font-semibold text-white">Accorder le statut de membre provisoire</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Les membres provisoires sont expulsés quand ils se déconnectent, à moins qu'un rôle leur ait été
                  assigné. Bientôt disponible.
                </p>
              </div>
              <Switch checked={false} disabled aria-label="Membre provisoire" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setView('invite')}>Annuler</Button>
              <Button onClick={generate} disabled={createInvite.isPending}>Générer un nouveau lien</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
