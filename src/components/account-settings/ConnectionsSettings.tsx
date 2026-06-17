import { useMemo, useState } from 'react';
import { Plus, Trash2, ChevronRight, Check, BadgeCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfile';
import { haptics } from '@/lib/haptics';
import { cn } from '@/lib/utils';
import {
  CONNECTION_PROVIDERS,
  CONNECTION_PROVIDERS_BY_ID,
  STAT_ENABLED_PROVIDERS,
  formatConnectionDisplay,
  formatStatCount,
  accountAgeYears,
  type ProfileConnection,
  type ConnectionStats,
} from '@/lib/connections';

export function ConnectionsSettings() {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();
  const current = useMemo<ProfileConnection[]>(() => {
    const raw = (profile as any)?.connections;
    return Array.isArray(raw) ? raw : [];
  }, [profile]);
  const [adding, setAdding] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [stats, setStats] = useState<ConnectionStats>({});

  const save = (next: ProfileConnection[]) => updateProfile.mutate({ connections: next } as any);

  const resetForm = () => {
    setAdding(false);
    setSelectedProvider(null);
    setValue('');
    setStats({});
  };

  const handleAdd = () => {
    if (!selectedProvider || !value.trim()) return;
    haptics.medium();
    const entry: ProfileConnection = { provider: selectedProvider, value: value.trim() };
    if (STAT_ENABLED_PROVIDERS.has(selectedProvider)) {
      const cleaned: ConnectionStats = {};
      if (stats.posts_count != null && !Number.isNaN(stats.posts_count)) cleaned.posts_count = stats.posts_count;
      if (stats.followers_count != null && !Number.isNaN(stats.followers_count)) cleaned.followers_count = stats.followers_count;
      if (stats.following_count != null && !Number.isNaN(stats.following_count)) cleaned.following_count = stats.following_count;
      if (stats.is_verified) cleaned.is_verified = true;
      if (stats.account_created_at) cleaned.account_created_at = stats.account_created_at;
      if (Object.keys(cleaned).length > 0) entry.stats = cleaned;
    }
    save([...current, entry]);
    resetForm();
  };

  const handleRemove = (idx: number) => {
    haptics.medium();
    save(current.filter((_, i) => i !== idx));
  };

  const showsStats = selectedProvider && STAT_ENABLED_PROVIDERS.has(selectedProvider);

  return (
    <div className="space-y-4">
      {current.length > 0 && (
        <section className="rounded-2xl bg-card border border-border/50 overflow-hidden">
          {current.map((c, i) => {
            const provider = CONNECTION_PROVIDERS_BY_ID[c.provider];
            if (!provider) return null;
            const Icon = provider.icon;
            const age = accountAgeYears(c.stats?.account_created_at);
            const statBits: string[] = [];
            if (c.stats?.followers_count != null) statBits.push(`${formatStatCount(c.stats.followers_count)} abonnés`);
            if (c.stats?.posts_count != null) statBits.push(`${formatStatCount(c.stats.posts_count)} posts`);
            if (age != null) statBits.push(age === 0 ? 'récent' : `${age} an${age > 1 ? 's' : ''}`);
            return (
              <div
                key={`${c.provider}-${i}`}
                className={cn('flex items-start gap-3 px-4 py-3', i < current.length - 1 && 'border-b border-border/40')}
              >
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40 shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-medium truncate">{formatConnectionDisplay(c)}</div>
                    {c.stats?.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{provider.label}</div>
                  {statBits.length > 0 && (
                    <div className="text-[11px] text-muted-foreground/80 mt-0.5 truncate">{statBits.join(' · ')}</div>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(i)}
                  className="w-9 h-9 rounded-full flex items-center justify-center active:bg-destructive/10 text-destructive shrink-0"
                  aria-label="Supprimer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </section>
      )}

      {!adding ? (
        <button
          onClick={() => {
            haptics.light();
            setAdding(true);
          }}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card border border-border/50 active:bg-muted/40"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-primary/15 text-primary">
            <Plus className="w-4 h-4" />
          </div>
          <span className="flex-1 text-left text-sm font-medium">Ajouter une connexion</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      ) : (
        <section className="rounded-2xl bg-card border border-border/50 p-4 space-y-3">
          {!selectedProvider ? (
            <div className="grid grid-cols-3 gap-2">
              {CONNECTION_PROVIDERS.map((provider) => {
                const Icon = provider.icon;
                return (
                  <button
                    key={provider.id}
                    onClick={() => {
                      haptics.light();
                      setSelectedProvider(provider.id);
                    }}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 active:bg-muted/60"
                  >
                    <Icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-[11px] font-medium text-center leading-tight">{provider.label}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {(() => {
                  const provider = CONNECTION_PROVIDERS_BY_ID[selectedProvider];
                  const Icon = provider.icon;
                  return (
                    <>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/40">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="text-sm font-semibold">{provider.label}</div>
                    </>
                  );
                })()}
              </div>
              <Input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={CONNECTION_PROVIDERS_BY_ID[selectedProvider]?.placeholder}
              />

              {showsStats && (
                <div className="space-y-3 pt-2 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground">
                    Informations déclaratives, utilisées par certains serveurs pour t'attribuer un rôle automatiquement. Aucune vérification automatique n'est faite.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Abonnés</Label>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={stats.followers_count ?? ''}
                        onChange={(e) => setStats((s) => ({ ...s, followers_count: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground">Posts</Label>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={stats.posts_count ?? ''}
                        onChange={(e) => setStats((s) => ({ ...s, posts_count: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Date de création du compte</Label>
                    <Input
                      type="date"
                      value={stats.account_created_at ?? ''}
                      onChange={(e) => setStats((s) => ({ ...s, account_created_at: e.target.value || undefined }))}
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <BadgeCheck className="w-4 h-4 text-sky-500" />
                      <Label className="text-sm">Compte certifié (badge bleu)</Label>
                    </div>
                    <Switch
                      checked={!!stats.is_verified}
                      onCheckedChange={(v) => setStats((s) => ({ ...s, is_verified: v }))}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button variant="ghost" className="flex-1" onClick={() => { setSelectedProvider(null); setValue(''); setStats({}); }}>
                  Retour
                </Button>
                <Button className="flex-1" disabled={!value.trim() || updateProfile.isPending} onClick={handleAdd}>
                  <Check className="w-4 h-4 mr-1" /> Ajouter
                </Button>
              </div>
            </div>
          )}
          {!selectedProvider && (
            <Button variant="ghost" className="w-full" onClick={resetForm}>
              Annuler
            </Button>
          )}
        </section>
      )}
    </div>
  );
}
