import { ReactNode } from 'react';
import { ChevronRight, Bell, Palette, Shield, BellOff, Volume2, Moon, Sun, Monitor, EyeOff, FileText } from 'lucide-react';
import { MobileProfileSubpage } from './MobileProfileSubpage';
import { haptics } from '@/lib/haptics';
import { toast } from 'sonner';

type Variant = 'notifications' | 'appearance' | 'privacy';

interface Props {
  onBack: () => void;
  variant: Variant;
  onOpenFullSettings: () => void;
}

const VARIANTS: Record<Variant, { title: string; description: string; rows: { icon: ReactNode; label: string; hint?: string }[] }> = {
  notifications: {
    title: 'Notifications',
    description: "Gère comment tu es alerté des messages, mentions et appels.",
    rows: [
      { icon: <Bell className="w-4 h-4" />, label: 'Notifications push', hint: 'Activé' },
      { icon: <BellOff className="w-4 h-4" />, label: 'Mode silencieux' },
      { icon: <Volume2 className="w-4 h-4" />, label: 'Sons' },
    ],
  },
  appearance: {
    title: 'Apparence',
    description: "Choisis le thème et la densité de l'interface.",
    rows: [
      { icon: <Moon className="w-4 h-4" />, label: 'Thème sombre', hint: 'Activé' },
      { icon: <Sun className="w-4 h-4" />, label: 'Thème clair' },
      { icon: <Monitor className="w-4 h-4" />, label: 'Suivre le système' },
    ],
  },
  privacy: {
    title: 'Confidentialité & sécurité',
    description: 'Contrôle tes données, ton activité et ta sécurité.',
    rows: [
      { icon: <Shield className="w-4 h-4" />, label: 'Authentification à 2 facteurs' },
      { icon: <EyeOff className="w-4 h-4" />, label: 'Bloquer les utilisateurs' },
      { icon: <FileText className="w-4 h-4" />, label: 'Données et historique' },
    ],
  },
};

export function MobileSettingsRedirectView({ onBack, variant, onOpenFullSettings }: Props) {
  const config = VARIANTS[variant];

  return (
    <MobileProfileSubpage title={config.title} onBack={onBack}>
      <div className="px-6 pt-6 pb-2">
        <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>
      </div>

      <section className="mx-4 mt-3 rounded-2xl bg-card border border-border/50 overflow-hidden">
        {config.rows.map((row, idx) => (
          <div key={row.label}>
            {idx > 0 && <div className="h-px bg-border/40 mx-4" />}
            <button
              onClick={() => {
                haptics.light();
                toast.info('Bientôt disponible sur mobile');
              }}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-muted/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted/40 text-muted-foreground">
                {row.icon}
              </div>
              <span className="flex-1 text-left text-sm font-medium">{row.label}</span>
              {row.hint && <span className="text-xs text-muted-foreground">{row.hint}</span>}
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        ))}
      </section>

      <div className="px-6 pt-6">
        <button
          onClick={() => {
            haptics.light();
            onOpenFullSettings();
          }}
          className="w-full h-12 rounded-xl bg-card border border-border/50 flex items-center justify-center gap-2 text-sm font-medium active:bg-muted/60 transition-colors"
        >
          Ouvrir tous les paramètres
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </MobileProfileSubpage>
  );
}
