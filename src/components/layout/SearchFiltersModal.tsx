import { useEffect, useRef, useState } from 'react';
import {
  User as UserIcon,
  Hash,
  AtSign,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  File as FileIcon,
  Frame,
  Calendar as CalendarIcon,
  Trash2,
  Plus,
  X,
  Check,
  Bot,
  Webhook,
  Pin,
  Music,
  BarChart3,
  Sticker,
  Forward,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { UserAvatarImage } from '@/components/ui/user-avatar-image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export type SearchFiltersFocus = 'from' | 'in' | 'has' | 'mentions' | 'date' | 'author' | 'pinned' | null;
export type HasType = 'image' | 'video' | 'link' | 'file' | 'embed' | 'sound' | 'poll' | 'sticker' | 'forward';
export type AuthorType = 'user' | 'bot' | 'webhook';
export type DateMode = 'before' | 'after' | 'during';

export interface DateCondition {
  mode: DateMode;
  date: Date | null;
}

export interface SearchFiltersValue {
  from: string[];      // member ids
  in: string[];        // channel ids
  has: HasType[];
  mentions: string[];  // member ids
  dates: DateCondition[];
  authorType: AuthorType | null;
  pinned: boolean | null;
}

export const emptySearchFilters = (): SearchFiltersValue => ({
  from: [],
  in: [],
  has: [],
  mentions: [],
  dates: [],
  authorType: null,
  pinned: null,
});

interface MemberLite {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
}
interface ChannelLite {
  id: string;
  name: string;
  type: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focus?: SearchFiltersFocus;
  initial?: SearchFiltersValue;
  members: MemberLite[];
  channels: ChannelLite[];
  onApply: (value: SearchFiltersValue) => void;
}

const HAS_OPTIONS: { value: HasType; label: string; icon: React.ReactNode }[] = [
  { value: 'image', label: 'Image', icon: <ImageIcon className="w-4 h-4" /> },
  { value: 'video', label: 'Video', icon: <Video className="w-4 h-4" /> },
  { value: 'link', label: 'Link', icon: <LinkIcon className="w-4 h-4" /> },
  { value: 'file', label: 'File', icon: <FileIcon className="w-4 h-4" /> },
  { value: 'embed', label: 'Embed', icon: <Frame className="w-4 h-4" /> },
];

const AUTHOR_OPTIONS: { value: AuthorType; label: string; icon: React.ReactNode }[] = [
  { value: 'user', label: 'User', icon: <UserIcon className="w-4 h-4" /> },
  { value: 'bot', label: 'Bot', icon: <Bot className="w-4 h-4" /> },
  { value: 'webhook', label: 'Webhook', icon: <Webhook className="w-4 h-4" /> },
];

function countActive(v: SearchFiltersValue): number {
  let n = 0;
  n += v.from.length;
  n += v.in.length;
  n += v.has.length;
  n += v.mentions.length;
  n += v.dates.filter((d) => d.date).length;
  if (v.authorType) n += 1;
  if (v.pinned !== null) n += 1;
  return n;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
      {children}
    </div>
  );
}

function MemberMultiSelect({
  members,
  selected,
  onChange,
  placeholder,
}: {
  members: MemberLite[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedMap = new Set(selected);
  const filtered = members.filter((m) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      m.username.toLowerCase().includes(s) ||
      m.displayName.toLowerCase().includes(s)
    );
  });
  const toggle = (id: string) => {
    if (selectedMap.has(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };
  const selectedMembers = selected
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean) as MemberLite[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
          className="flex flex-wrap items-center gap-1 min-h-[36px] w-full rounded-xl border border-border bg-input px-2 py-1 cursor-text"
        >
          {selectedMembers.map((m) => (
            <span
              key={m.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-surface-2 pl-1 pr-1.5 py-0.5 text-xs"
            >
              {m.avatar ? (
                <UserAvatarImage
                  src={m.avatar}
                  alt={m.displayName}
                  ownerId={m.id}
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <Avatar className="w-4 h-4">
                  <AvatarFallback className="text-[8px]">
                    {m.displayName.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <span className="truncate max-w-[120px]">{m.displayName}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(m.id);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${m.displayName}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={selectedMembers.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-[--radix-popover-trigger-width] max-h-[260px] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollArea className="max-h-[260px]">
          <div className="p-1">
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                No matches
              </div>
            )}
            {filtered.map((m) => {
              const checked = selectedMap.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-surface-hover text-left"
                >
                  <span
                    className={cn(
                      'w-4 h-4 shrink-0 rounded border flex items-center justify-center',
                      checked
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border',
                    )}
                  >
                    {checked && <Check className="w-3 h-3" />}
                  </span>
                  {m.avatar ? (
                    <UserAvatarImage
                      src={m.avatar}
                      alt={m.displayName}
                      ownerId={m.id}
                      className="w-6 h-6 rounded-full"
                    />
                  ) : (
                    <Avatar className="w-6 h-6">
                      <AvatarFallback className="text-[10px]">
                        {m.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <span className="flex-1 min-w-0 truncate">
                    {m.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    @{m.username}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function ChannelMultiSelect({
  channels,
  selected,
  onChange,
  placeholder,
}: {
  channels: ChannelLite[];
  selected: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedMap = new Set(selected);
  const filtered = channels.filter((c) =>
    !q ? true : c.name.toLowerCase().includes(q.toLowerCase()),
  );
  const toggle = (id: string) => {
    if (selectedMap.has(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  };
  const selectedChannels = selected
    .map((id) => channels.find((c) => c.id === id))
    .filter(Boolean) as ChannelLite[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          onClick={() => {
            setOpen(true);
            inputRef.current?.focus();
          }}
          className="flex flex-wrap items-center gap-1 min-h-[36px] w-full rounded-xl border border-border bg-input px-2 py-1 cursor-text"
        >
          {selectedChannels.map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs"
            >
              <Hash className="w-3 h-3 text-muted-foreground" />
              <span className="truncate max-w-[140px]">{c.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(c.id);
                }}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${c.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={selectedChannels.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[80px] bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-[--radix-popover-trigger-width] max-h-[260px] overflow-hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ScrollArea className="max-h-[260px]">
          <div className="p-1">
            {filtered.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                No matches
              </div>
            )}
            {filtered.map((c) => {
              const checked = selectedMap.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-surface-hover text-left"
                >
                  <span
                    className={cn(
                      'w-4 h-4 shrink-0 rounded border flex items-center justify-center',
                      checked
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border',
                    )}
                  >
                    {checked && <Check className="w-3 h-3" />}
                  </span>
                  <Hash className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{c.name}</span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}


export function SearchFiltersModal({
  open,
  onOpenChange,
  focus,
  initial,
  members,
  channels,
  onApply,
}: Props) {
  const [value, setValue] = useState<SearchFiltersValue>(
    initial ?? emptySearchFilters()
  );

  useEffect(() => {
    if (open) setValue(initial ?? emptySearchFilters());
  }, [open, initial]);

  const total = countActive(value);

  const setHas = (h: HasType) => {
    setValue((v) =>
      v.has.includes(h)
        ? { ...v, has: v.has.filter((x) => x !== h) }
        : { ...v, has: [...v.has, h] }
    );
  };

  const setDateCond = (idx: number, patch: Partial<DateCondition>) => {
    setValue((v) => ({
      ...v,
      dates: v.dates.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    }));
  };
  const removeDate = (idx: number) => {
    setValue((v) => ({ ...v, dates: v.dates.filter((_, i) => i !== idx) }));
  };
  const addDate = () => {
    setValue((v) =>
      v.dates.length >= 2
        ? v
        : { ...v, dates: [...v.dates, { mode: 'during', date: null }] }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/40">
          <DialogTitle>Filters</DialogTitle>
        </div>
        <ScrollArea className="max-h-[70vh]">
          <div className="px-5 py-4 space-y-5">
            {/* From */}
            <div>
              <FieldLabel>From</FieldLabel>
              <MemberMultiSelect
                members={members}
                selected={value.from}
                onChange={(next) => setValue((v) => ({ ...v, from: next }))}
                placeholder="Rechercher un utilisateur"
              />
            </div>

            {/* In */}
            <div>
              <FieldLabel>In</FieldLabel>
              <ChannelMultiSelect
                channels={channels}
                selected={value.in}
                onChange={(next) => setValue((v) => ({ ...v, in: next }))}
                placeholder="Rechercher un salon"
              />
            </div>

            {/* Has */}
            <div>
              <FieldLabel>Has</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {HAS_OPTIONS.map((opt) => {
                  const active = value.has.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setHas(opt.value)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface-2 border-border hover:bg-surface-hover'
                      )}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mentions */}
            <div>
              <FieldLabel>Mentions</FieldLabel>
              <MemberMultiSelect
                members={members}
                selected={value.mentions}
                onChange={(next) => setValue((v) => ({ ...v, mentions: next }))}
                placeholder="Rechercher un utilisateur"
              />
            </div>

            {/* Date */}
            <div>
              <FieldLabel>Date</FieldLabel>
              <div className="space-y-2">
                {value.dates.map((cond, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Select
                      value={cond.mode}
                      onValueChange={(m) =>
                        setDateCond(idx, { mode: m as DateMode })
                      }
                    >
                      <SelectTrigger className="h-9 w-[110px] text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="before">Before</SelectItem>
                        <SelectItem value="after">After</SelectItem>
                        <SelectItem value="during">During</SelectItem>
                      </SelectContent>
                    </Select>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-9 flex-1 justify-start text-left font-normal text-sm"
                        >
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          {cond.date ? format(cond.date, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={cond.date ?? undefined}
                          onSelect={(d) => setDateCond(idx, { date: d ?? null })}
                          initialFocus
                          className={cn('p-3 pointer-events-auto')}
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDate(idx)}
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
                      aria-label="Remove date"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                {value.dates.length < 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={addDate}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add date
                  </Button>
                )}
              </div>
            </div>

            {/* Author Type */}
            <div>
              <FieldLabel>Author Type</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {AUTHOR_OPTIONS.map((opt) => {
                  const active = value.authorType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        setValue((v) => ({
                          ...v,
                          authorType: active ? null : opt.value,
                        }))
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface-2 border-border hover:bg-surface-hover'
                      )}
                    >
                      {opt.icon}
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pinned */}
            <div>
              <FieldLabel>Pinned</FieldLabel>
              <div className="flex items-center gap-1.5">
                {[
                  { v: true, label: 'True' },
                  { v: false, label: 'False' },
                ].map((opt) => {
                  const active = value.pinned === opt.v;
                  return (
                    <button
                      key={String(opt.v)}
                      onClick={() =>
                        setValue((v) => ({
                          ...v,
                          pinned: active ? null : opt.v,
                        }))
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border transition',
                        active
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-surface-2 border-border hover:bg-surface-hover'
                      )}
                    >
                      <Pin className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
                {value.pinned !== null && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setValue((v) => ({ ...v, pinned: null }))}
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Clear pinned"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <Separator />
        <div className="flex items-center justify-between gap-2 px-5 py-3">
          <div>
            {total > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setValue(emptySearchFilters())}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear Filters ({total})
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                onApply(value);
                onOpenChange(false);
              }}
            >
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
