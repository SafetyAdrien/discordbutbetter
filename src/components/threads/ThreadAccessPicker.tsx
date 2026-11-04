import { useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X } from '@/components/icons/discord/lucide';
import { Check, ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

/*
 * Selecteur d'acces d'un fil prive : menu deroulant a choix multiples (roles + membres).
 * Les elements choisis s'affichent en pastilles dans le champ ; le createur et les moderateurs
 * ont toujours acces, ils n'ont donc pas a etre choisis.
 */

export interface AccessRole { id: string; name: string; color?: string }
export interface AccessMember { id: string; displayName: string; username: string; avatar?: string }

interface Props {
  roles: AccessRole[];
  members: AccessMember[];
  selectedRoleIds: string[];
  selectedUserIds: string[];
  onChange: (next: { roleIds: string[]; userIds: string[] }) => void;
  disabled?: boolean;
}

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function RoleDot({ color }: { color?: string }) {
  return <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color || '#99aab5' }} aria-hidden />;
}

function MemberAvatar({ m, size }: { m: AccessMember; size: number }) {
  return m.avatar ? (
    <img src={m.avatar} alt="" style={{ width: size, height: size }} className="rounded-full object-cover shrink-0" />
  ) : (
    <span style={{ width: size, height: size }} className="rounded-full bg-[#5865f2] text-white text-[10px] font-semibold flex items-center justify-center shrink-0" aria-hidden>
      {m.displayName.charAt(0).toUpperCase()}
    </span>
  );
}

function Row({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onClick}
      className="w-full h-9 px-2 flex items-center gap-2.5 rounded text-left text-base text-[#dbdee1] hover:bg-[#464650] hover:text-white transition-colors"
    >
      <span
        className={cn('w-5 h-5 rounded-[4px] border-2 shrink-0 flex items-center justify-center', selected ? 'bg-[#5865f2] border-[#5865f2]' : 'border-[#80848e]')}
        aria-hidden
      >
        {selected && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3.5} />}
      </span>
      {children}
    </button>
  );
}

export function ThreadAccessPicker({ roles, members, selectedRoleIds, selectedUserIds, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const shownRoles = useMemo(() => roles.filter((r) => !q || r.name.toLowerCase().includes(q)), [roles, q]);
  const shownMembers = useMemo(
    () => members.filter((m) => !q || m.displayName.toLowerCase().includes(q) || m.username.toLowerCase().includes(q)),
    [members, q],
  );

  const chosenRoles = roles.filter((r) => selectedRoleIds.includes(r.id));
  const chosenMembers = members.filter((m) => selectedUserIds.includes(m.id));
  const count = chosenRoles.length + chosenMembers.length;

  const setRoles = (roleIds: string[]) => onChange({ roleIds, userIds: selectedUserIds });
  const setUsers = (userIds: string[]) => onChange({ roleIds: selectedRoleIds, userIds });

  return (
    <div className="mt-3">
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(''); }}>
        <PopoverTrigger asChild>
          <div
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-label="Rôles et membres ayant accès au fil"
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); setOpen((v) => !v); } }}
            className={cn(
              'min-h-12 w-full px-3 py-1.5 flex items-center gap-1.5 flex-wrap rounded-lg bg-[#2f2f37] border cursor-pointer text-base outline-none transition-colors',
              open ? 'border-[#5b63e4]' : 'border-white/[0.04] hover:border-[#4c4c54] focus-visible:border-[#5b63e4]',
              disabled && 'opacity-60 pointer-events-none',
            )}
          >
            {count === 0 && <span className="text-[#80848e] py-1.5">Sélectionne des rôles ou des membres</span>}
            {chosenRoles.map((r) => (
              <span key={r.id} className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md bg-[#464650] text-sm text-white max-w-full">
                <RoleDot color={r.color} />
                <span translate="no" className="truncate">{r.name}</span>
                <button type="button" aria-label={`Retirer le rôle ${r.name}`} onClick={(e) => { e.stopPropagation(); setRoles(selectedRoleIds.filter((x) => x !== r.id)); }} className="w-5 h-5 rounded flex items-center justify-center text-[#b5bac1] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            {chosenMembers.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1.5 h-7 pl-1 pr-1 rounded-md bg-[#464650] text-sm text-white max-w-full">
                <MemberAvatar m={m} size={20} />
                <span translate="no" className="truncate">{m.displayName}</span>
                <button type="button" aria-label={`Retirer ${m.displayName}`} onClick={(e) => { e.stopPropagation(); setUsers(selectedUserIds.filter((x) => x !== m.id)); }} className="w-5 h-5 rounded flex items-center justify-center text-[#b5bac1] hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <ChevronDown className={cn('ml-auto w-5 h-5 shrink-0 text-[#b5bac1] transition-transform', open && 'rotate-180')} aria-hidden />
          </div>
        </PopoverTrigger>

        <PopoverContent align="start" sideOffset={6} className="w-[var(--radix-popover-trigger-width)] p-0 overflow-hidden">
          <div className="p-2 border-b border-white/[0.06]">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#80848e]" aria-hidden />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un rôle ou un membre"
                aria-label="Rechercher un rôle ou un membre"
                className="w-full h-8 pl-8 pr-2 rounded bg-[#2f2f37] text-sm text-white placeholder:text-[#80848e] outline-none border border-transparent focus:border-[#5b63e4]"
              />
            </div>
          </div>

          <div role="listbox" aria-multiselectable className="max-h-[260px] overflow-y-auto scrollbar-thin p-1.5">
            {shownRoles.length > 0 && (
              <>
                <p className="px-2 pt-1.5 pb-1 text-xs font-semibold uppercase tracking-wide text-[#b5bac1]">Rôles</p>
                {shownRoles.map((r) => (
                  <Row key={r.id} selected={selectedRoleIds.includes(r.id)} onClick={() => setRoles(toggle(selectedRoleIds, r.id))}>
                    <RoleDot color={r.color} />
                    <span translate="no" className="truncate">{r.name}</span>
                  </Row>
                ))}
              </>
            )}
            {shownMembers.length > 0 && (
              <>
                <p className="px-2 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-[#b5bac1]">Membres</p>
                {shownMembers.map((m) => (
                  <Row key={m.id} selected={selectedUserIds.includes(m.id)} onClick={() => setUsers(toggle(selectedUserIds, m.id))}>
                    <MemberAvatar m={m} size={24} />
                    <span translate="no" className="truncate text-white">{m.displayName}</span>
                    {m.username && <span translate="no" className="truncate text-sm text-[#b5bac1]">{m.username}</span>}
                  </Row>
                ))}
              </>
            )}
            {shownRoles.length === 0 && shownMembers.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-[#b5bac1]">Aucun résultat.</p>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <p className="mt-2 text-sm leading-[18px] text-[#b5bac1]">
        {count === 0
          ? 'Sans sélection, seuls toi et les modérateurs pourront voir ce fil.'
          : 'Ces rôles et ces membres, toi ainsi que les modérateurs pourront voir et écrire dans ce fil.'}
      </p>
    </div>
  );
}
