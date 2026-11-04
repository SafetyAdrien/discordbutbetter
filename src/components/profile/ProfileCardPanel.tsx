import { useState } from 'react';
import { ProfileCardHeader, type ProfileCardUser } from './ProfileCardHeader';
import { ProfileMoreMenu } from './ProfileMoreMenu';
import { parseMarkdown, setMarkdownContext, getMarkdownContext } from '@/lib/markdown';
import { Plus } from '@/components/icons/discord/lucide';
import { appLocale } from '@/i18n/locale';
import { cn } from '@/lib/utils';

/*
 * Carte de profil (video de reference) : banniere de 168px, avatar de 160px a cheval,
 * bulle de statut a droite de l'avatar, nom 24px gras, pseudo • pronoms puis badges,
 * rangee d'actions (bouton principal, menu "..."), puis sections A propos de moi /
 * Membre depuis / Connexions / Note. Sert a la fois a l'apercu de l'editeur (champs
 * editables en place via `editor`) et au profil complet d'un autre utilisateur.
 */

export type { ProfileCardUser };

export interface ProfileCardEditor {
  name: string;
  onName: (v: string) => void;
  pronouns: string;
  onPronouns: (v: string) => void;
  bio: string;
  onBio: (v: string) => void;
  bioMax: number;
  /** Boutons flottants poses sur l'avatar (menu "changer / supprimer"). */
  avatarSlot?: React.ReactNode;
  /** Bouton flottant pose sur la banniere. */
  bannerSlot?: React.ReactNode;
  /** Menu de selection du tag de serveur (a droite des pronoms). */
  tagSlot?: React.ReactNode;
  /** Lien "Ajouter une connexion". */
  onAddConnection?: () => void;
  /** Bouton emoji pose dans le champ de biographie. */
  bioEmoji?: React.ReactNode;
  namePlaceholder?: string;
  pronounsPlaceholder?: string;
  bioPlaceholder?: string;
}

interface Props {
  user: ProfileCardUser;
  isOwn: boolean;
  /** Fond de la banniere quand il n'y a pas d'image (couleur / degrade). */
  bannerStyle?: React.CSSProperties;
  /** Couleur de la bordure de l'avatar : par defaut celle de la carte. */
  actions?: React.ReactNode;
  editor?: ProfileCardEditor;
  /** Profil de serveur : date d'arrivee dans le serveur et roles. */
  serverJoin?: { date: string; icon: string | null; name: string } | null;
  roles?: { id: string; name: string; color: string | null }[];
  /** Bloc "Note" (profil d'un autre utilisateur). */
  note?: React.ReactNode;
  bannerGuard?: React.HTMLAttributes<HTMLDivElement>;
  className?: string;
}

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(appLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h4 className="text-[13px] font-medium leading-[18px] text-[#b5bac1]">{label}</h4>
      <div className="mt-2 text-base leading-[22px] text-white">{children}</div>
    </section>
  );
}

function InlineField({
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  inputClassName,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  maxLength: number;
  className?: string;
  inputClassName?: string;
  ariaLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        maxLength={maxLength}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === 'Escape') && setEditing(false)}
        style={{ boxShadow: 'inset 0 0 0 2px #5b63e4' }}
        className={cn('bg-[#33333b] rounded-lg border-0 px-[7px] outline-none min-w-0', inputClassName)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={ariaLabel}
      className={cn('text-left rounded-lg border-2 border-transparent hover:border-[#4c4c54] hover:bg-[#33333b] cursor-text transition-colors min-w-0 truncate', className)}
    >
      {value || <span className="italic text-muted-foreground">{placeholder}</span>}
    </button>
  );
}

export function ProfileCardPanel({ user, isOwn, bannerStyle, actions, editor, note, bannerGuard, serverJoin, roles, className }: Props) {
  const [bioEditing, setBioEditing] = useState(false);
  const renderedBio = !editor && user.bio
    ? (() => {
        const prev = getMarkdownContext();
        setMarkdownContext({ ...prev, variant: 'bio' });
        const out = parseMarkdown(user.bio!);
        setMarkdownContext(prev);
        return out;
      })()
    : null;

  const name = editor ? editor.name : user.display_name;
  const pronouns = editor ? editor.pronouns : user.pronouns ?? '';
  const connections = user.connections ?? [];

  return (
    <div className={cn('relative flex flex-col bg-[#383840] overflow-y-auto scrollbar-thin', className)}>
      <ProfileCardHeader
        size="lg"
        user={{ ...user, display_name: name, pronouns }}
        isOwn={isOwn}
        bannerStyle={bannerStyle}
        bannerGuard={bannerGuard}
        avatarSlot={editor?.avatarSlot}
        bannerSlot={editor?.bannerSlot}
        tagSlot={editor?.tagSlot}
        className="pb-8"
        nameSlot={
          editor ? (
            <InlineField
              value={name}
              onChange={editor.onName}
              placeholder={editor.namePlaceholder ?? "Nom d'affichage"}
              maxLength={32}
              ariaLabel="Modifier le nom d'affichage"
              className="block max-w-full px-1 -mx-1 text-2xl leading-[30px] font-bold text-white"
              inputClassName="w-full h-[34px] text-2xl font-bold text-white"
            />
          ) : undefined
        }
        pronounsSlot={
          editor ? (
            <>
              <span aria-hidden>•</span>
              <InlineField
                value={pronouns}
                onChange={editor.onPronouns}
                placeholder={editor.pronounsPlaceholder ?? "Ajouter des pronoms"}
                maxLength={40}
                ariaLabel="Modifier les pronoms"
                className="px-1 -mx-1"
                inputClassName="w-[160px] h-7 text-base text-white"
              />
            </>
          ) : undefined
        }
      >
        {/* Actions */}
        <div className="mt-[18px] flex items-center gap-2">
          {actions}
          <ProfileMoreMenu profile={user} variant="square" />
        </div>

        <Section label="À propos de moi">
          {editor ? (
            bioEditing ? (
              <div className="relative -mx-[7px]">
                <textarea
                  autoFocus
                  ref={(el) => {
                    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
                  }}
                  value={editor.bio}
                  onChange={(e) => editor.onBio(e.target.value)}
                  onBlur={(e) => { if (!e.currentTarget.parentElement?.contains(e.relatedTarget as Node | null)) setBioEditing(false); }}
                  maxLength={editor.bioMax}
                  rows={1}
                  aria-label="À propos de moi"
                  placeholder={editor.bioPlaceholder ?? 'Ta vibe en cinq mots'}
                  style={{ boxShadow: 'inset 0 0 0 2px #5b63e4' }}
                  className="block w-full resize-none overflow-hidden rounded-lg bg-[#33333b] border-0 pl-[7px] pr-10 py-[6px] text-base leading-[22px] text-white placeholder:text-muted-foreground outline-none"
                />
                {editor.bioEmoji && <span className="absolute right-2 top-1/2 -translate-y-1/2">{editor.bioEmoji}</span>}
                {editor.bio.length > editor.bioMax * 0.9 && (
                  <span className="absolute right-2 -bottom-5 text-xs text-muted-foreground tabular-nums">{editor.bio.length}/{editor.bioMax}</span>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setBioEditing(true)}
                aria-label="Modifier la biographie"
                className="block -mx-[7px] w-[calc(100%+14px)] text-left cursor-text break-words whitespace-pre-wrap rounded-lg border-2 border-transparent pl-[5px] pr-2 py-1 hover:border-[#4c4c54] hover:bg-[#33333b] transition-colors"
              >
                {editor.bio || <span className="italic text-muted-foreground">{editor.bioPlaceholder ?? 'Ta vibe en cinq mots'}</span>}
              </button>
            )
          ) : renderedBio ? (
            <div className="text-base markdown-preview max-w-none break-words">{renderedBio}</div>
          ) : (
            <span className="text-muted-foreground">Aucune biographie définie.</span>
          )}
        </Section>

        {user.created_at && (
          <Section label="Membre depuis">
            <span className="inline-flex items-center gap-2 flex-wrap">
              {dateOf(user.created_at)}
              {serverJoin && (
                <>
                  <span aria-hidden>•</span>
                  {serverJoin.icon ? <img src={serverJoin.icon} alt="" className="w-5 h-5 rounded-full object-cover" /> : <span className="w-5 h-5 rounded-full bg-primary/30 text-[10px] flex items-center justify-center">{serverJoin.name.charAt(0).toUpperCase()}</span>}
                  {dateOf(serverJoin.date)}
                </>
              )}
            </span>
          </Section>
        )}

        {roles && (
          <Section label="Rôles">
            {roles.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <span key={r.id} className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md text-xs font-medium bg-white/[0.06] border border-white/[0.06]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color || 'hsl(var(--muted-foreground))' }} />
                    <span translate="no" className="text-white">{r.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-muted-foreground">Aucun rôle.</span>
            )}
          </Section>
        )}

        {(connections.length > 0 || editor?.onAddConnection) && (
          <Section label="Connexions">
            {connections.length > 0 && (
              <ul className="space-y-1">
                {connections.map((c, i) => (
                  <li key={`${c.provider}-${i}`} className="text-base">
                    <span className="capitalize text-muted-foreground">{c.provider}</span> · {c.value}
                  </li>
                ))}
              </ul>
            )}
            {editor?.onAddConnection && (
              <button
                type="button"
                onClick={editor.onAddConnection}
                className={cn('flex items-center gap-2 text-sm text-[#b5bac1] hover:text-white transition-colors', connections.length > 0 && 'mt-2')}
              >
                <Plus className="w-4 h-4" /> Ajouter une connexion
              </button>
            )}
          </Section>
        )}

        {note}
      </ProfileCardHeader>
    </div>
  );
}
