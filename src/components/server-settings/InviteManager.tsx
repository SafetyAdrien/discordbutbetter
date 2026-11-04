import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { X } from '@/components/icons/serverSettingsIcons';
import { useServerInvites, useDeleteInvite, type Invite } from '@/hooks/useInvites';
import { useServerSettings, useUpdateServerSettings } from '@/hooks/useServerSettings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { CreateInviteModal } from '@/components/modals/CreateInviteModal';
import { copyToClipboard } from '@/lib/clipboard';
import { ComingSoonBadge, SettingsPage } from './SettingsUI';
import { settingsInputCls } from './settingsStyles';

import { appLocale } from '@/i18n/locale';
/*
 * Page "Invitations" (video de reference) : liens actifs en tableau avec
 * compte a rebours d'expiration, "Creer un lien d'invitation" (meme fenetre
 * que le bouton d'invitation du serveur) et "Suspendre les invitations"
 * (fenetre "Actions de cybersecurite", appliquee par use_invite).
 */

const PAUSE_OPTIONS = [
  { hours: 1, label: '1 heure' },
  { hours: 2, label: '2 heures' },
  { hours: 6, label: '6 heures' },
  { hours: 12, label: '12 heures' },
  { hours: 24, label: '24 heures' },
];

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function countdown(expiresAt: string | null, now: number): string {
  if (!expiresAt) return '∞';
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 'Expiré';
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const d = Math.floor(s / 86400);
  const rest = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
  return d > 0 ? `${d}:${rest}` : rest;
}

export function InviteManager({ serverId }: { serverId: string }) {
  const { data: invites = [], isLoading } = useServerInvites(serverId);
  const { data: settings } = useServerSettings(serverId);
  const updateSettings = useUpdateServerSettings();
  const deleteInvite = useDeleteInvite();
  const [createOpen, setCreateOpen] = useState(false);
  const [pauseOpen, setPauseOpen] = useState(false);
  const now = useNow();

  const pausedUntil = settings?.invites_paused_until ? new Date(settings.invites_paused_until).getTime() : 0;
  const paused = pausedUntil > now;
  const active = invites.filter((i) => !i.expires_at || new Date(i.expires_at).getTime() > now);

  return (
    <SettingsPage
      title="Invitations"
      description="Crée un lien d'invitation que n'importe qui peut utiliser pour rejoindre, ou invite directement des ami(e)s."
    >
      {paused && (
        <div className="mb-4 flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-[#f0b232]/10 border border-[#f0b232]/30">
          <p className="text-sm text-foreground">
            Les invitations sont suspendues jusqu'à{' '}
            <strong>{new Date(pausedUntil).toLocaleTimeString(appLocale(), { hour: '2-digit', minute: '2-digit' })}</strong>.
            Personne ne peut rejoindre le serveur avec un lien.
          </p>
          <Button size="sm" variant="secondary" onClick={() => updateSettings.mutate({ serverId, settings: { invites_paused_until: null } })}>
            Reprendre
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">Liens d'invitation actifs</p>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPauseOpen(true)}
            className="border-destructive/60 bg-transparent text-destructive hover:bg-destructive hover:text-white"
          >
            Suspendre les invitations
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>Créer un lien d'invitation</Button>
        </div>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-[1.4fr_1fr_0.8fr_1fr_28px] gap-3 pb-2 border-b border-border text-xs font-semibold text-muted-foreground">
          <span>Hôte</span>
          <span>Code d'invitation</span>
          <span>Utilisations</span>
          <span>Expiration</span>
          <span />
        </div>
        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : active.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Aucune invitation active pour l'instant.</p>
        ) : (
          active.map((invite: Invite) => (
            <div key={invite.id} className="group grid grid-cols-[1.4fr_1fr_0.8fr_1fr_28px] gap-3 items-center h-14 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="w-7 h-7">
                  <AvatarImage src={invite.creator?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">{invite.creator?.display_name?.charAt(0).toUpperCase() ?? '?'}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-foreground truncate">{invite.creator?.display_name ?? 'Inconnu'}</span>
              </div>
              <button
                type="button"
                title="Copier le lien"
                onClick={() => copyToClipboard(`${window.location.origin}/invite/${invite.code}`, "Lien d'invitation copié !")}
                className="text-left text-sm font-mono text-foreground truncate hover:underline"
              >
                {invite.code}
              </button>
              <span className="text-sm text-foreground">
                {invite.uses}{invite.max_uses ? ` / ${invite.max_uses}` : ''}
              </span>
              <span className="text-sm font-mono text-foreground">{countdown(invite.expires_at, now)}</span>
              <button
                type="button"
                aria-label="Révoquer l'invitation"
                onClick={() => deleteInvite.mutate({ inviteId: invite.id, serverId })}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center transition-opacity"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {createOpen && <CreateInviteModal serverId={serverId} onClose={() => setCreateOpen(false)} />}
      <SecurityActionsDialog
        open={pauseOpen}
        paused={paused}
        onClose={() => setPauseOpen(false)}
        onSave={(hours, pauseInvites) => {
          updateSettings.mutate({
            serverId,
            settings: {
              invites_paused_until: pauseInvites ? new Date(Date.now() + hours * 3_600_000).toISOString() : null,
            },
          });
          setPauseOpen(false);
        }}
      />
    </SettingsPage>
  );
}

function SecurityActionsDialog({
  open,
  paused,
  onClose,
  onSave,
}: {
  open: boolean;
  paused: boolean;
  onClose: () => void;
  onSave: (hours: number, pauseInvites: boolean) => void;
}) {
  const [hours, setHours] = useState(2);
  const [pauseInvites, setPauseInvites] = useState(true);
  useEffect(() => {
    if (open) setPauseInvites(true);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[440px] p-4 gap-0">
        <DialogTitle className="text-xl font-semibold text-white">Actions de cybersécurité</DialogTitle>
        <DialogDescription className="sr-only">Suspendre temporairement les invitations</DialogDescription>
        <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className={`${settingsInputCls} mt-4`}>
          {PAUSE_OPTIONS.map((o) => <option key={o.hours} value={o.hours}>{o.label}</option>)}
        </select>
        <div className="mt-3 p-3 rounded-lg bg-[hsl(var(--card))] flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white">Suspendre les invitations</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Empêche temporairement les nouveaux membres de rejoindre ce serveur via des liens d'invitation.
              {paused && ' Une suspension est déjà en cours : elle sera remplacée.'}
            </p>
          </div>
          <Switch checked={pauseInvites} onCheckedChange={setPauseInvites} />
        </div>
        <div className="mt-2 p-3 rounded-lg bg-[hsl(var(--card))] flex items-start justify-between gap-4 opacity-60">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white">Mettre les MP en pause <ComingSoonBadge /></p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Empêche temporairement l'envoi de nouveaux messages privés entre les membres de ton serveur qui ne sont pas amis.
            </p>
          </div>
          <Switch checked={false} disabled aria-label="Mettre les MP en pause" />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={onClose}>Annuler</Button>
          <Button onClick={() => onSave(hours, pauseInvites)}>Sauvegarder</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
