import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SettingsPage, SettingsToggleRow, UnsavedChangesBar } from './SettingsUI';
import { settingsInputCls } from './settingsStyles';
import { usePermissions } from '@/hooks/usePermissions';
import { useServerTagConfig, useUpsertServerTag } from '@/hooks/useServerTags';
import { ServerTagPill, TagBadgeIcon } from '@/components/server-tags/ServerTagBadge';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BADGE_PACKS, DEFAULT_TAG_COLOR, HEX_COLOR_RE, TAG_BADGES, TAG_NAME_MAX, sanitizeTagName, tagErrorMessage, validateTagName } from '@/lib/serverTags';
import { cn } from '@/lib/utils';

/*
 * "Tag du serveur" (reference : parametres du serveur de Discord) : interrupteur, nom de 2 a 4 caracteres, galerie de
 * badges pixel art, couleur, apercu en direct dans un salon. Enregistrer passe par la fonction serveur
 * upsert_server_tag (permission, validation, version attendue). Un changement de nom, badge ou couleur oblige les
 * membres a re-selectionner le tag : une confirmation le rappelle quand des membres l'utilisent deja.
 */

const sb = supabase as unknown as { from: (t: string) => any };

function useTagUserCount(serverId: string) {
  return useQuery({
    queryKey: ['server-tag-users', serverId],
    staleTime: 15_000,
    queryFn: async () => {
      const { count } = await sb.from('user_server_tags').select('user_id', { count: 'exact', head: true }).eq('server_id', serverId);
      return (count as number | null) ?? 0;
    },
  });
}

export function ServerTagSettings({ serverId }: { serverId: string }) {
  const { isGod, hasPermission } = usePermissions(serverId);
  const canEdit = isGod || hasPermission('manage_server');
  const { data: config, isLoading, isError, refetch } = useServerTagConfig(serverId);
  const { data: users = 0 } = useTagUserCount(serverId);
  const save = useUpsertServerTag(serverId);

  const [enabled, setEnabled] = useState(false);
  const [name, setName] = useState('');
  const [badge, setBadge] = useState('leaf');
  const [color, setColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [customColor, setCustomColor] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    setEnabled(config?.enabled ?? true);
    setName(config?.name ?? '');
    setBadge(config?.badge_id ?? 'leaf');
    setColor(config?.color ?? DEFAULT_TAG_COLOR);
    setCustomColor(!!config?.color);
    setError(null);
  }, [config, isLoading]);

  const nameError = name ? validateTagName(name) : null;
  const dirty = config
    ? enabled !== config.enabled || name !== config.name || badge !== config.badge_id || (customColor ? color : null) !== (config.color ?? null)
    : name.length > 0;
  const visualChange = !!config && (name !== config.name || badge !== config.badge_id || (customColor ? color : null) !== (config.color ?? null));

  const reset = () => {
    setEnabled(config?.enabled ?? true);
    setName(config?.name ?? '');
    setBadge(config?.badge_id ?? 'leaf');
    setColor(config?.color ?? DEFAULT_TAG_COLOR);
    setCustomColor(!!config?.color);
    setError(null);
  };

  const doSave = () => {
    setError(null);
    save.mutate(
      { name, badgeId: badge, color: customColor ? color : null, enabled, expectedVersion: config?.version ?? null },
      {
        onSuccess: () => toast.success('Tag du serveur enregistré'),
        onError: (e) => setError(tagErrorMessage(e)),
      },
    );
  };

  const requestSave = () => {
    const v = validateTagName(name);
    if (v) return setError(v);
    if (customColor && !HEX_COLOR_RE.test(color)) return setError('Couleur invalide.');
    if (visualChange && users > 0) return setConfirmOpen(true);
    doSave();
  };

  const previewTag = useMemo(() => ({ serverId, name: name || 'TAG', badgeId: badge, color: customColor ? color : null }), [serverId, name, badge, color, customColor]);

  if (isLoading) {
    return (
      <SettingsPage title="Tag du serveur">
        <div role="status" className="flex items-center gap-2 text-sm text-muted-foreground py-10"><Loader2 className="w-4 h-4 animate-spin" /> Chargement…</div>
      </SettingsPage>
    );
  }
  if (isError) {
    return (
      <SettingsPage title="Tag du serveur">
        <div role="alert" className="rounded-lg bg-[hsl(var(--card))] p-4 text-sm text-white">
          Impossible de charger le tag du serveur.{' '}
          <button type="button" onClick={() => void refetch()} className="text-[hsl(var(--text-link))] hover:underline">Réessayer</button>
        </div>
      </SettingsPage>
    );
  }

  return (
    <SettingsPage title="Tag du serveur" description="Les membres peuvent afficher le tag de ton serveur à côté de leur nom, partout dans l'application.">
      <div className="flex flex-col xl:flex-row gap-8">
        <div className="min-w-0 flex-1">
          <div className="rounded-lg bg-[hsl(var(--card))] px-4">
            <SettingsToggleRow
              title="Activer le tag du serveur"
              description={canEdit ? undefined : "Seuls le propriétaire et les administrateurs peuvent modifier le tag."}
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={!canEdit}
            />
          </div>

          <h3 className="mt-8 mb-3 text-base font-semibold text-white">Choisis ton nom</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 h-[60px] px-3 rounded-lg bg-[hsl(var(--search-background))] border border-white/[0.06] w-[220px] shrink-0">
              <TagBadgeIcon id={badge} color={customColor ? color : null} className="w-8 h-8" />
              <input
                id="server-tag-name"
                value={name}
                onChange={(e) => setName(sanitizeTagName(e.target.value))}
                disabled={!canEdit}
                maxLength={TAG_NAME_MAX}
                spellCheck={false}
                autoComplete="off"
                aria-label="Nom du tag"
                aria-invalid={!!nameError}
                placeholder="TAG"
                className="w-full min-w-0 bg-transparent outline-none text-xl text-white placeholder:text-[hsl(var(--text-placeholder))]"
              />
            </div>
            <p className="text-sm text-muted-foreground max-w-[200px]">Tu peux utiliser un maximum de {TAG_NAME_MAX} caractères, lettres ou chiffres.</p>
          </div>
          {nameError && <p role="alert" className="mt-2 text-sm text-[#f57976]">{nameError}</p>}

          <h3 className="mt-8 mb-3 text-base font-semibold text-white">Choisis un badge</h3>
          <div className="space-y-4" role="radiogroup" aria-label="Badge du tag">
            {BADGE_PACKS.map((pack) => (
              <div key={pack.id}>
                <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{pack.label}</p>
                <div className="grid grid-cols-5 gap-2 max-w-[420px]">
                  {TAG_BADGES.filter((b) => b.pack === pack.id).map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      role="radio"
                      aria-checked={badge === b.id}
                      aria-label={b.name}
                      title={b.name}
                      disabled={!canEdit}
                      onClick={() => setBadge(b.id)}
                      className={cn(
                        'h-[62px] rounded-lg flex items-center justify-center bg-[hsl(var(--search-background))] border transition-colors disabled:opacity-60',
                        badge === b.id ? 'border-primary bg-primary/10' : 'border-white/[0.06] hover:border-white/20',
                      )}
                    >
                      <TagBadgeIcon id={b.id} color={customColor ? color : null} className="w-8 h-8" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <h3 className="mt-8 mb-3 text-base font-semibold text-white">Couleur</h3>
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => setCustomColor(false)}
              aria-pressed={!customColor}
              className={cn('h-10 px-3 rounded-lg text-sm font-medium border transition-colors disabled:opacity-60', !customColor ? 'border-primary bg-primary/10 text-white' : 'border-white/[0.06] text-muted-foreground hover:text-white')}
            >
              Par défaut
            </button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => setCustomColor(true)}
                  aria-label="Couleur personnalisée"
                  className={cn('h-10 w-24 rounded-lg border transition-colors disabled:opacity-60', customColor ? 'border-primary' : 'border-white/[0.06]')}
                  style={{ background: customColor ? color : 'hsl(var(--search-background))' }}
                />
              </PopoverTrigger>
              <PopoverContent align="start" className="z-[140] w-[340px] p-0 border-none bg-transparent shadow-none">
                <ModernColorPicker value={color} onChange={(c) => { setColor(c); setCustomColor(true); }} />
              </PopoverContent>
            </Popover>
            {customColor && <span className="text-sm text-muted-foreground tabular-nums">{color.toUpperCase()}</span>}
          </div>

          {error && <p role="alert" className="mt-6 text-sm text-[#f57976]">{error}</p>}
          {config && users > 0 && <p className="mt-6 text-sm text-muted-foreground">{users} membre{users > 1 ? 's' : ''} affiche{users > 1 ? 'nt' : ''} ce tag.</p>}
        </div>

        {/* Apercu en direct */}
        <aside className="xl:w-[300px] shrink-0">
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Aperçu</p>
          <div className="rounded-lg bg-[hsl(var(--card))] border border-white/[0.06] p-4 space-y-3 opacity-95" aria-label="Aperçu du tag dans un salon">
            <div className="flex gap-3 opacity-60"><span className="w-9 h-9 rounded-full bg-[#5865f2]/40" /><div><p className="text-sm font-medium text-[#8b9cff]">Roka</p><p className="text-sm text-muted-foreground">qqn est chaud pour un aram ?</p></div></div>
            <div className="flex gap-3">
              <span className="w-9 h-9 rounded-full bg-[#f0a232]/60 shrink-0" />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium text-white">Lily {enabled || !config ? <ServerTagPill tag={previewTag} /> : <span className="text-xs text-muted-foreground">(tag désactivé)</span>}</p>
                <p className="text-sm text-[#dbdee1]">mate un peu mon tag !</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <UnsavedChangesBar visible={canEdit && dirty} onReset={reset} onSave={requestSave} saving={save.isPending} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Modifier le tag du serveur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {users} membre{users > 1 ? 's' : ''} utilise{users > 1 ? 'nt' : ''} ce tag. Après cette modification, ils ne l'afficheront plus tant qu'ils ne l'auront pas sélectionné à nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={doSave}>Modifier le tag</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsPage>
  );
}
