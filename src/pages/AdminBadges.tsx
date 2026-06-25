import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useBadges, useIsAppAdmin, type Badge } from '@/hooks/useBadges';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, Save, Trash2, ArrowLeft, Award, Palette } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ModernColorPicker } from '@/components/profile/calendar/ModernColorPicker';
import { toast } from 'sonner';

interface ProfileSearchResult {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function BadgeRow({ badge, onChanged }: { badge: Badge | null; onChanged: () => void }) {
  const isNew = !badge;
  const [name, setName] = useState(badge?.name ?? '');
  const [key, setKey] = useState(badge?.key ?? '');
  const [description, setDescription] = useState(badge?.description ?? '');
  const [color, setColor] = useState(badge?.color ?? '#5865F2');
  const [sortOrder, setSortOrder] = useState(badge?.sort_order ?? 0);
  const [iconUrl, setIconUrl] = useState<string | null>(badge?.icon_url ?? null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    if (file.size > 100 * 1024) {
      toast.error('Icône trop lourde (max 100 KB). Utilise un SVG.');
      return;
    }
    const url = await fileToDataUrl(file);
    setIconUrl(url);
  };

  const handleSave = async () => {
    if (!key.trim() || !name.trim()) {
      toast.error('Clé et nom requis');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('upsert_badge', {
      _id: badge?.id ?? null,
      _key: key.trim(),
      _name: name.trim(),
      _description: description,
      _icon_url: iconUrl,
      _color: color,
      _sort_order: sortOrder,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(isNew ? 'Badge créé' : 'Badge mis à jour');
    onChanged();
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-4">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center bg-background/40 border border-border/50 shrink-0"
          style={{ color }}
        >
          {iconUrl ? (
            <img src={iconUrl} alt={name} className="w-12 h-12 object-contain" />
          ) : (
            <Award className="w-8 h-8" />
          )}
        </div>
        <div className="flex-1 grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Clé (unique)</Label>
            <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="bug_hunter" />
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label className="text-xs">Couleur</Label>
            <div className="flex gap-2 items-center">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="w-10 h-9 rounded-md border border-border/40 flex items-center justify-center hover:ring-2 hover:ring-primary/40 transition"
                    style={{ backgroundColor: color }}
                    aria-label="Choisir une couleur"
                  >
                    <Palette className="w-3.5 h-3.5 text-white mix-blend-difference" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[340px] p-0 border-none bg-transparent shadow-none">
                  <ModernColorPicker value={color} onChange={setColor} />
                </PopoverContent>
              </Popover>
              <Input value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Ordre</Label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <input
          ref={fileRef}
          type="file"
          accept="image/svg+xml,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1.5" /> Icône
        </Button>
        {iconUrl && (
          <Button size="sm" variant="ghost" onClick={() => setIconUrl(null)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-4 h-4 mr-1.5" />}
          {isNew ? 'Créer' : 'Enregistrer'}
        </Button>
      </div>
    </Card>
  );
}

function AssignmentPanel({ badges }: { badges: Badge[] }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [selected, setSelected] = useState<ProfileSearchResult | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['admin-search-profiles', debounced],
    enabled: debounced.length > 0,
    queryFn: async (): Promise<ProfileSearchResult[]> => {
      const { data, error } = await supabase.rpc('admin_search_profiles', { _query: debounced });
      if (error) throw error;
      return (data as ProfileSearchResult[]) ?? [];
    },
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['admin-user-badges', selected?.id],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', selected!.id);
      if (error) throw error;
      return data ?? [];
    },
  });

  const ownedSet = useMemo(() => new Set(userBadges.map((r) => r.badge_id)), [userBadges]);

  const toggle = useMutation({
    mutationFn: async ({ badgeId, on }: { badgeId: string; on: boolean }) => {
      if (!selected) return;
      const rpc = on ? 'grant_badge' : 'revoke_badge';
      const { error } = await supabase.rpc(rpc, { _user_id: selected.id, _badge_id: badgeId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-user-badges', selected?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-badges'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Rechercher un utilisateur</Label>
        <Input
          placeholder="username ou display name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {debounced && !selected && (
        <div className="space-y-1 max-h-64 overflow-y-auto rounded-lg border border-border/40 p-2">
          {isFetching && <div className="text-xs text-muted-foreground p-2">Recherche…</div>}
          {!isFetching && results.length === 0 && (
            <div className="text-xs text-muted-foreground p-2">Aucun résultat</div>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelected(u)}
              className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 text-left"
            >
              <Avatar className="w-8 h-8">
                <AvatarImage src={u.avatar_url ?? undefined} />
                <AvatarFallback>{(u.display_name || u.username).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="text-sm font-medium">{u.display_name || u.username}</div>
                <div className="text-xs text-muted-foreground">@{u.username}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Card className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={selected.avatar_url ?? undefined} />
              <AvatarFallback>{(selected.display_name || selected.username).slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{selected.display_name || selected.username}</div>
              <div className="text-xs text-muted-foreground">@{selected.username}</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
              Changer
            </Button>
          </div>

          <div className="space-y-2">
            {badges.map((b) => {
              const on = ownedSet.has(b.id);
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-3 p-2 rounded-md border border-border/40"
                >
                  <div
                    className="w-9 h-9 rounded-md flex items-center justify-center bg-background/40 border border-border/40"
                    style={{ color: b.color }}
                  >
                    {b.icon_url ? (
                      <img src={b.icon_url} alt={b.name} className="w-7 h-7 object-contain" />
                    ) : (
                      <Award className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: b.color }}>{b.name}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{b.description}</div>
                  </div>
                  <Switch
                    checked={on}
                    onCheckedChange={(v) => toggle.mutate({ badgeId: b.id, on: v })}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

export default function AdminBadges() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: adminLoading } = useIsAppAdmin();
  const { data: badges = [], refetch } = useBadges();
  const [tab, setTab] = useState<'catalog' | 'assign'>('catalog');
  const [creatingNew, setCreatingNew] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center p-6">
        <Award className="w-12 h-12 text-muted-foreground" />
        <h1 className="text-xl font-bold">Accès refusé</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          Cette page est réservée aux administrateurs de l'application.
        </p>
        <Button onClick={() => navigate('/')} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Retour
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Retour
          </Button>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Award className="w-6 h-6" /> Gestion des badges
          </h1>
        </div>

        <div className="flex gap-2 border-b border-border/40">
          {(['catalog', 'assign'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'catalog' ? 'Catalogue' : 'Attribuer'}
            </button>
          ))}
        </div>

        {tab === 'catalog' && (
          <div className="space-y-4">
            {badges.map((b) => (
              <BadgeRow key={b.id} badge={b} onChanged={refetch} />
            ))}
            {creatingNew ? (
              <BadgeRow
                badge={null}
                onChanged={() => {
                  setCreatingNew(false);
                  refetch();
                }}
              />
            ) : (
              <Button variant="outline" onClick={() => setCreatingNew(true)}>
                + Nouveau badge
              </Button>
            )}
          </div>
        )}

        {tab === 'assign' && <AssignmentPanel badges={badges} />}
      </div>
    </div>
  );
}
