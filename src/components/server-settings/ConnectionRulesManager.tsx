import { useState } from 'react';
import { Plus, Trash2, Pencil, BadgeCheck, Twitter, Instagram, Youtube, Cloud, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useServerRoles } from '@/hooks/useRoles';
import {
  useServerConnectionRules,
  useUpsertConnectionRule,
  useDeleteConnectionRule,
  type ServerConnectionRule,
} from '@/hooks/useServerConnectionRules';

const PROVIDERS = [
  { id: 'twitter', label: 'X / Twitter', icon: Twitter },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'youtube', label: 'YouTube', icon: Youtube },
  { id: 'bluesky', label: 'Bluesky', icon: Cloud },
] as const;

const PROVIDERS_BY_ID = Object.fromEntries(PROVIDERS.map((p) => [p.id, p]));

interface Props {
  serverId: string;
}

type Draft = Partial<ServerConnectionRule> & { provider: string; role_id: string; name: string };

export function ConnectionRulesManager({ serverId }: Props) {
  const { data: rules = [] } = useServerConnectionRules(serverId);
  const { data: roles = [] } = useServerRoles(serverId);
  const upsert = useUpsertConnectionRule(serverId);
  const del = useDeleteConnectionRule(serverId);

  const [editing, setEditing] = useState<Draft | null>(null);

  const startNew = () =>
    setEditing({ provider: 'twitter', role_id: '', name: '', require_verified: false });

  const startEdit = (r: ServerConnectionRule) => setEditing({ ...r });

  const save = () => {
    if (!editing || !editing.role_id || !editing.name.trim() || !editing.provider) return;
    upsert.mutate(
      {
        ...editing,
        server_id: serverId,
        name: editing.name.trim(),
        description: editing.description?.trim() || null,
      },
      { onSuccess: () => setEditing(null) },
    );
  };

  const assignableRoles = roles.filter((r) => !r.is_default);

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <header className="space-y-1">
        <h2 className="text-xl font-bold">Critères Connections</h2>
        <p className="text-sm text-muted-foreground">
          Attribue automatiquement un rôle aux membres qui ont lié un compte (Twitter/X, Instagram, Bluesky, YouTube) respectant tes seuils.
          Les statistiques sont déclarées par les membres et ne sont pas vérifiées automatiquement.
        </p>
      </header>

      <Button onClick={startNew} size="sm" className="gap-2">
        <Plus className="w-4 h-4" />
        Nouvelle règle
      </Button>

      <div className="space-y-2">
        {rules.length === 0 && (
          <div className="rounded-lg border border-border/50 bg-card p-6 text-sm text-muted-foreground text-center">
            Aucune règle. Crée-en une pour commencer.
          </div>
        )}
        {rules.map((r) => {
          const provider = PROVIDERS_BY_ID[r.provider];
          const Icon = provider?.icon ?? BadgeCheck;
          const role = roles.find((x) => x.id === r.role_id);
          const bits: string[] = [];
          if (r.min_followers != null) bits.push(`≥ ${r.min_followers} abonnés`);
          if (r.min_posts != null) bits.push(`≥ ${r.min_posts} posts`);
          if (r.min_account_age_days != null) bits.push(`compte ≥ ${r.min_account_age_days} j`);
          if (r.require_verified) bits.push('certifié');
          return (
            <div key={r.id} className="rounded-lg border border-border/50 bg-card p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{r.name}</div>
                <div className="text-xs text-muted-foreground">
                  {provider?.label ?? r.provider} → attribue <span className="font-medium" style={{ color: role?.color ?? undefined }}>{role?.name ?? 'rôle inconnu'}</span>
                </div>
                {bits.length > 0 && (
                  <div className="text-xs text-muted-foreground/80 mt-1">{bits.join(' · ')}</div>
                )}
                {r.description && <div className="text-xs text-foreground/70 mt-1">{r.description}</div>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => startEdit(r)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Modifier la règle' : 'Nouvelle règle'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Nom</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="Ex: Créateur vérifié"
                />
              </div>
              <div>
                <Label>Description (facultatif)</Label>
                <Textarea
                  value={editing.description ?? ''}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Plateforme</Label>
                  <Select value={editing.provider} onValueChange={(v) => setEditing({ ...editing, provider: v as ServerConnectionRule['provider'] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROVIDERS.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Rôle attribué</Label>
                  <Select value={editing.role_id} onValueChange={(v) => setEditing({ ...editing, role_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisir…" /></SelectTrigger>
                    <SelectContent>
                      {assignableRoles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Abonnés min.</Label>
                  <Input
                    type="number" min={0} inputMode="numeric"
                    value={editing.min_followers ?? ''}
                    onChange={(e) => setEditing({ ...editing, min_followers: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Posts min.</Label>
                  <Input
                    type="number" min={0} inputMode="numeric"
                    value={editing.min_posts ?? ''}
                    onChange={(e) => setEditing({ ...editing, min_posts: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <Label>Âge minimum du compte (jours)</Label>
                <Input
                  type="number" min={0} inputMode="numeric"
                  value={editing.min_account_age_days ?? ''}
                  onChange={(e) => setEditing({ ...editing, min_account_age_days: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-sky-500" />
                  <Label>Compte certifié requis</Label>
                </div>
                <Switch
                  checked={!!editing.require_verified}
                  onCheckedChange={(v) => setEditing({ ...editing, require_verified: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Annuler</Button>
            <Button onClick={save} disabled={upsert.isPending || !editing?.role_id || !editing?.name?.trim()}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
