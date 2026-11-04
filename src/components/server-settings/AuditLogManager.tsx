import { useState, useMemo } from 'react';
import { useAuditLogs, ACTION_TYPES, CATEGORY_LABELS, AuditCategory, AuditLog } from '@/hooks/useAuditLogs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { History, ChevronRight } from '@/components/icons/discord/lucide';
import { ChevronDown } from '@/components/icons/serverSettingsIcons';
import { SettingsEmptyState } from './SettingsUI';
import { settingsInputCls } from './settingsStyles';
import { format } from '@/lib/dateUtils';
import { fr } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

interface AuditLogManagerProps {
  serverId: string;
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nom',
  icon_url: 'Icône',
  banner_url: 'Bannière',
  avatar_url: 'Avatar',
  description: 'Description',
  owner_id: 'Propriétaire',
  secondary_owner_id: 'Second propriétaire',
  is_public: 'Public',
  color: 'Couleur',
  hoist: 'Affiché à part',
  position: 'Position',
  category_id: 'Catégorie',
  channel_id: 'Salon',
  slowmode_seconds: 'Slowmode (s)',
};

function formatValue(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  if (typeof v === 'string' && v.length > 40) return v.slice(0, 40) + '…';
  return String(v);
}

export function AuditLogManager({ serverId }: AuditLogManagerProps) {
  const [selectedActionTypes, setSelectedActionTypes] = useState<string[]>([]);
  const [actorFilter, setActorFilter] = useState('');

  const { data: logs = [], isLoading, error } = useAuditLogs(serverId, {
    actionTypes: selectedActionTypes.length > 0 ? selectedActionTypes : undefined,
  });

  const grouped = useMemo(() => {
    const map = new Map<AuditCategory, typeof ACTION_TYPES[number][]>();
    for (const a of ACTION_TYPES) {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    }
    return map;
  }, []);

  const filteredLogs = logs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const actors = Array.from(
    new Map(logs.filter((l) => l.actor).map((l) => [l.actor!.id, l.actor!])).values(),
  );
  const visibleLogs = filteredLogs.filter((l) => !actorFilter || l.actor_id === actorFilter);

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-semibold leading-6 text-white">Logs du serveur</h2>
        <div className="flex flex-wrap gap-3">
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Filtrer par utilisateur</p>
            <select value={actorFilter} onChange={(e) => setActorFilter(e.target.value)} className={cn(settingsInputCls, 'h-8 w-[180px] text-sm')}>
              <option value="">Tous les utilisateurs</option>
              {actors.map((a) => <option key={a.id} value={a.id}>{a.username}</option>)}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-muted-foreground">Filtrer par action</p>
            <select
              value={selectedActionTypes[0] ?? ''}
              onChange={(e) => setSelectedActionTypes(e.target.value ? [e.target.value] : [])}
              className={cn(settingsInputCls, 'h-8 w-[180px] text-sm')}
            >
              <option value="">Toutes les actions</option>
              {Array.from(grouped.entries()).map(([cat, actions]) => (
                <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                  {actions.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mt-6">
        {error ? (
          <SettingsEmptyState icon={<History className="w-12 h-12" />} title="Accès restreint" description="Tu n'as pas la permission de voir les logs du serveur." />
        ) : visibleLogs.length === 0 ? (
          <SettingsEmptyState
            icon={<History className="w-12 h-12" />}
            title="Aucun log"
            description={selectedActionTypes.length > 0 || actorFilter ? 'Essaie de modifier tes filtres.' : 'Les actions apparaîtront ici dès que des modifications seront faites.'}
          />
        ) : (
          <div className="space-y-2">
            {visibleLogs.map((log) => (
              <AuditLogRow key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const OBJECT_NOUNS: Record<string, string> = {
  role: 'le rôle',
  channel: 'le salon',
  category: 'la catégorie',
  invite: 'une invitation',
  webhook: 'le webhook',
  emoji: "l'émoji",
  sticker: "l'autocollant",
  thread: 'le fil',
  channel_overwrite: 'les permissions du salon',
};

const VERBS: Record<string, string> = { create: 'a créé', update: 'a modifié', delete: 'a supprimé' };

const SPECIAL_PHRASES: Record<string, string> = {
  server_update: 'a apporté des modifications au serveur',
  secondary_owner_add: 'a défini un second propriétaire :',
  secondary_owner_remove: 'a retiré le second propriétaire',
  OWNERSHIP_TRANSFERRED: 'a transféré la propriété à',
  member_kick: 'a expulsé',
  kick: 'a expulsé',
  member_ban: 'a banni',
  ban: 'a banni',
  member_unban: 'a débanni',
  unban: 'a débanni',
  member_role_add: 'a attribué un rôle à',
  member_role_remove: 'a retiré un rôle à',
  role_permission_grant: 'a accordé une permission au rôle',
  role_permission_revoke: 'a révoqué une permission du rôle',
  message_delete: 'a supprimé un message',
  message_pin: 'a épinglé un message',
  message_unpin: 'a désépinglé un message',
};

function describe(log: AuditLog): { phrase: string; object?: string } {
  const d = (log.details ?? {}) as Record<string, unknown>;
  const name = (d.name || d.role_name || d.channel_name || d.code) as string | undefined;
  const special = SPECIAL_PHRASES[log.action_type];
  if (special) return { phrase: special, object: log.target?.display_name ?? name };
  const m = log.action_type.match(/^(.*)_(create|update|delete)$/);
  if (m) return { phrase: `${VERBS[m[2]]} ${OBJECT_NOUNS[m[1]] ?? m[1]}`, object: name ?? log.target?.display_name };
  return { phrase: ACTION_TYPES.find((a) => a.value === log.action_type)?.label ?? log.action_type, object: name };
}

function when(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  const time = format(date, 'HH:mm', { locale: fr });
  if (date.toDateString() === today.toDateString()) return `Aujourd'hui à ${time}`;
  if (date.toDateString() === yesterday.toDateString()) return `Hier à ${time}`;
  return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

function detailLines(log: AuditLog): React.ReactNode[] {
  const d = (log.details ?? {}) as Record<string, unknown>;
  const lines: React.ReactNode[] = [];
  const changes = d.changes as Record<string, { old: unknown; new: unknown }> | undefined;
  if (d.code) lines.push(<>Avec le code <strong className="text-white">{String(d.code)}</strong></>);
  if (d.channel_name && log.action_type.startsWith('invite')) lines.push(<>Pour le salon <strong className="text-white">#{String(d.channel_name)}</strong></>);
  if (d.max_uses !== undefined) lines.push(<>Avec un nombre d'utilisations <strong className="text-white">{d.max_uses ? String(d.max_uses) : 'illimité'}</strong></>);
  if (d.permission) lines.push(<>Permission <strong className="text-white">{String(d.permission)}</strong></>);
  if (d.reason) lines.push(<>Raison : <strong className="text-white">{String(d.reason)}</strong></>);
  if (d.content_preview) lines.push(<>« {String(d.content_preview)} »</>);
  if (changes) {
    for (const [field, diff] of Object.entries(changes)) {
      lines.push(
        <>
          A changé <strong className="text-white">{FIELD_LABELS[field] ?? field}</strong> de{' '}
          <strong className="text-white">{formatValue(diff.old)}</strong> à <strong className="text-white">{formatValue(diff.new)}</strong>
        </>,
      );
    }
  }
  return lines;
}

function AuditLogRow({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false);
  const { phrase, object } = describe(log);
  const lines = detailLines(log);
  const tone = log.action_type.endsWith('delete') || /ban|kick|revoke|remove/.test(log.action_type)
    ? 'text-destructive'
    : log.action_type.endsWith('create') || /add|grant|unban/.test(log.action_type)
      ? 'text-[hsl(var(--online))]'
      : 'text-[#f0b232]';
  const def = ACTION_TYPES.find((a) => a.value === log.action_type);

  return (
    <div className="rounded-lg bg-[hsl(var(--card))] border border-white/[0.06]">
      <button
        type="button"
        disabled={lines.length === 0}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-left disabled:cursor-default"
      >
        <span className={cn('w-6 flex justify-center shrink-0', tone)} title={def?.label}>
          <History className="w-4 h-4" />
        </span>
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={log.actor?.avatar_url || undefined} />
          <AvatarFallback>{log.actor?.display_name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
        </Avatar>
        <span className="flex-1 min-w-0">
          <span className="block text-sm text-muted-foreground">
            <span className="font-medium text-white">{log.actor?.username ?? 'Système'}</span> {phrase}
            {object && <> <strong className="text-white">{object}</strong></>}
          </span>
          <span className="block text-xs text-muted-foreground">{when(log.created_at)}</span>
        </span>
        {lines.length > 0 && (open ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronRight className="w-5 h-5 text-muted-foreground" />)}
      </button>
      {open && (
        <ol className="px-4 pb-3 pl-[88px] space-y-1">
          {lines.map((line, i) => (
            <li key={i} className="text-sm text-muted-foreground">
              <span className="mr-2 font-mono text-xs text-[hsl(var(--online))]">{String(i + 1).padStart(2, '0')}</span>– {line}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
