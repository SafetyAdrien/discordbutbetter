import { useState } from 'react';
import { Check, Info } from '@/components/icons/discord/lucide';
import { ChevronRight, Maximize2, Minimize2, X } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useChannelPermissionOverrides } from '@/hooks/useChannelPermissions';
import { useServerRoles } from '@/hooks/useRoles';
import { cn } from '@/lib/utils';
import { EXAMPLE_POST_TITLES } from '@/lib/forum';

/*
 * "Commencer (N sur 5 terminees)" en tete d'un Forum ou d'un salon
 * Multimedia, pour les moderateurs (video de reference). Chaque etape se
 * coche toute seule d'apres l'etat reel du salon et ouvre l'endroit ou la
 * faire. La carte se replie, et se ferme (rouverte par l'icone "i" de
 * l'en-tete).
 */

interface Props {
  channelId: string;
  serverId: string;
  mode: 'forum' | 'media';
  hasGuide: boolean;
  hasTags: boolean;
  hasDefaultReaction: boolean;
  hasPosts: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onDismiss: () => void;
  onOpenSettings: (tab: 'overview' | 'permissions') => void;
  onCreatePost: (title?: string) => void;
}

export function ForumGettingStarted({ channelId, serverId, mode, hasGuide, hasTags, hasDefaultReaction, hasPosts, collapsed, onToggleCollapsed, onDismiss, onOpenSettings, onCreatePost }: Props) {
  const { data: overrides = [] } = useChannelPermissionOverrides(channelId);
  const { data: roles = [] } = useServerRoles(serverId);
  const everyone = roles.find((r) => (r as { is_default?: boolean }).is_default);
  const permsOk = !overrides.some(
    (o) => o.role_id === everyone?.id && o.type === 'deny' && (o.permission === 'view_channel' || o.permission === 'send_messages'),
  );
  const [examplesOpen, setExamplesOpen] = useState(false);
  // Roles qui peuvent poster : celui de tout le monde quand rien ne le refuse, sinon les roles autorises explicitement.
  const posters = permsOk
    ? [{ id: 'everyone', name: '@everyone', color: '' }]
    : roles
        .filter((r) => overrides.some((o) => o.role_id === r.id && o.type === 'allow' && o.permission === 'send_messages'))
        .map((r) => ({ id: r.id, name: r.name, color: (r as { color?: string | null }).color ?? '' }));

  const steps = [
    {
      id: 'perms',
      done: permsOk,
      title: 'Définir les permissions recommandées',
      text: mode === 'media'
        ? 'Les salons multimédias qui autorisent tout le monde à poster suscitent généralement plus de participation de la part de leurs membres.'
        : 'Les forums qui autorisent tout le monde à poster suscitent généralement plus de participation de la part de leurs membres.',
      extra: posters.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {posters.map((r) => (
            <span key={r.id} translate="no" className="inline-flex items-center gap-2 h-[26px] px-2.5 rounded-[4px] border text-sm text-white" style={{ borderColor: r.color ? `${r.color}80` : 'hsl(var(--border-subtle))', backgroundColor: 'rgba(0,0,0,0.12)' }}>
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: r.color || '#99aab5' }} />{r.name}
            </span>
          ))}
        </div>
      ),
      run: () => onOpenSettings('permissions'),
    },
    { id: 'guide', done: hasGuide, title: 'Créer un guide des posts', text: 'Instaure des règles à suivre pour les personnes qui postent.', run: () => onOpenSettings('overview') },
    { id: 'tags', done: hasTags, title: 'Crée des tags', text: 'Aide les autres à organiser leurs posts en sous-catégories et à filtrer leurs recherches.', run: () => onOpenSettings('overview') },
    { id: 'reaction', done: hasDefaultReaction, title: 'Définis une réaction par défaut aux posts', text: "Choisis un émoji par défaut que les gens pourront utiliser pour réagir à un post.", run: () => onOpenSettings('overview') },
    { id: 'post', done: hasPosts, title: 'Crée le premier post !', text: 'Lance la conversation pour faire bouger les choses.', examples: true, run: () => onCreatePost() },
  ];
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <section className="rounded-xl bg-[#35353d] border border-white/[0.05]" aria-label="Commencer">
      <div className="flex items-center gap-2 px-4 h-[52px]">
        <p className="text-base text-white">
          <span className="font-semibold">Commencer</span> <span className="ml-1 font-normal">({doneCount} sur {steps.length} terminées)</span>
        </p>
        <span className="ml-auto flex items-center gap-1.5 text-xs text-[#dbdee1]">
          <Info className="w-3 h-3" /> Seuls les modérateurs peuvent y avoir accès
        </span>
        <button type="button" aria-label={collapsed ? 'Déplier' : 'Replier'} onClick={onToggleCollapsed} className="p-1 text-[#dbdee1] hover:text-white">
          {collapsed ? <Maximize2 className="w-3.5 h-3.5" strokeWidth={2.2} /> : <Minimize2 className="w-3.5 h-3.5" strokeWidth={2.2} />}
        </button>
        <button type="button" aria-label="Fermer" onClick={onDismiss} className="p-1 text-[#dbdee1] hover:text-white">
          <X className="w-3.5 h-3.5" strokeWidth={2.2} />
        </button>
      </div>
      {!collapsed && (
        <div className="px-2.5 pb-2.5 space-y-2">
          {steps.map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={s.run}
              onKeyDown={(e) => e.key === 'Enter' && s.run()}
              className="group flex items-start gap-4 pl-4 pr-4 py-3.5 rounded-lg bg-[#313139] hover:bg-[#2c2c33] cursor-pointer"
            >
              {s.done ? (
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#23a55a] flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-white" />
                </span>
              ) : s.id === 'perms' ? (
                <span aria-label="À définir" className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-[#f57976] flex items-center justify-center text-[13px] font-extrabold leading-none text-[#313139]">!</span>
              ) : (
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 border-[#b5bac1]" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn('text-base font-medium', s.done ? 'text-[#b5bac1]' : 'text-white')}>{s.title}</p>
                <p className="text-sm text-[#dbdee1]">
                  {s.text}
                  {s.examples && (
                    <>
                      {' '}
                      <Popover open={examplesOpen} onOpenChange={setExamplesOpen}>
                        <PopoverTrigger asChild>
                          <button type="button" onClick={(e) => e.stopPropagation()} className="text-[hsl(var(--text-link))] hover:underline">
                            Voir des exemples
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-1" onClick={(e) => e.stopPropagation()}>
                          {EXAMPLE_POST_TITLES.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setExamplesOpen(false);
                                onCreatePost(t);
                              }}
                              className="w-full px-2 py-[6px] rounded-[4px] text-[14px] leading-[18px] text-foreground hover:bg-[hsl(var(--surface-hover))] transition-colors"
                            >
                              {t}
                            </button>
                          ))}
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                </p>
                {'extra' in s && s.extra}
              </div>
              <ChevronRight className="mt-1 w-4 h-4 shrink-0 text-[#b5bac1] group-hover:text-white" strokeWidth={2} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
