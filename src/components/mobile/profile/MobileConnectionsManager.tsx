import { useState, useMemo } from 'react';
import { Plus, Trash2, ChevronRight, Check } from 'lucide-react';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile } from '@/hooks/useProfile';
import {
  CONNECTION_PROVIDERS,
  CONNECTION_PROVIDERS_BY_ID,
  formatConnectionDisplay,
  type ProfileConnection,
} from '@/lib/connections';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Props {
  onBack: () => void;
}

export function MobileConnectionsManager({ onBack }: Props) {
  const { profile } = useAuth();
  const updateProfile = useUpdateProfile();

  const current = useMemo<ProfileConnection[]>(() => {
    const raw = (profile as any)?.connections;
    return Array.isArray(raw) ? raw : [];
  }, [profile]);

  const [adding, setAdding] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [value, setValue] = useState('');

  const save = (next: ProfileConnection[]) => {
    updateProfile.mutate({ connections: next } as any);
  };

  const handleAdd = () => {
    if (!selectedProvider || !value.trim()) return;
    haptics.medium();
    const next = [...current, { provider: selectedProvider, value: value.trim() }];
    save(next);
    setAdding(false);
    setSelectedProvider(null);
    setValue('');
  };

  const handleRemove = (idx: number) => {
    haptics.medium();
    const next = current.filter((_, i) => i !== idx);
    save(next);
    toast.success('Connexion supprimée');
  };

  return (
    <MobileProfileSubpage title="Connexions" onBack={onBack}>
      <div className="px-4 py-4 space-y-4">
        {/* Existing connections */}
        {current.length > 0 && (
          <section className="rounded-2xl bg-card border border-border/50 overflow-hidden">
            {current.map((c, i) => {
              const p = CONNECTION_PROVIDERS_BY_ID[c.provider];
              if (!p) return null;
              const Icon = p.icon;
              return (
                <div
                  key={`${c.provider}-${i}`}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3',
                    i < current.length - 1 && 'border-b border-border/40',
                  )}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{formatConnectionDisplay(c)}</div>
                    <div className="text-[11px] text-muted-foreground">{p.label}</div>
                  </div>
                  <button
                    onClick={() => handleRemove(i)}
                    className="w-9 h-9 rounded-full flex items-center justify-center active:bg-destructive/10 text-destructive"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </section>
        )}

        {/* Add new */}
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
            {/* Provider grid */}
            {!selectedProvider ? (
              <div className="grid grid-cols-3 gap-2">
                {CONNECTION_PROVIDERS.map(p => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        haptics.light();
                        setSelectedProvider(p.id);
                      }}
                      className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-muted/40 active:bg-muted/60"
                    >
                      <Icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[11px] font-medium text-center leading-tight">
                        {p.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {(() => {
                    const p = CONNECTION_PROVIDERS_BY_ID[selectedProvider];
                    const Icon = p.icon;
                    return (
                      <>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted/40">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="text-sm font-semibold">{p.label}</div>
                      </>
                    );
                  })()}
                </div>
                <Input
                  autoFocus
                  value={value}
                  onChange={e => setValue(e.target.value)}
                  placeholder={CONNECTION_PROVIDERS_BY_ID[selectedProvider]?.placeholder}
                />
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setSelectedProvider(null);
                      setValue('');
                    }}
                  >
                    Retour
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!value.trim() || updateProfile.isPending}
                    onClick={handleAdd}
                  >
                    <Check className="w-4 h-4 mr-1" /> Ajouter
                  </Button>
                </div>
              </div>
            )}
            {!selectedProvider && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setAdding(false)}
              >
                Annuler
              </Button>
            )}
          </section>
        )}
      </div>
    </MobileProfileSubpage>
  );
}
