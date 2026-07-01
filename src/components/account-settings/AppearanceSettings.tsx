import { Check, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme, type ThemePreference } from '@/contexts/ThemeContext';

const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
  available: boolean;
}> = [
  {
    value: 'dark',
    label: 'Sombre',
    description: 'Le thème par défaut de NexusChat.',
    icon: Moon,
    available: true,
  },
  {
    value: 'light',
    label: 'Clair',
    description: "Bientôt disponible — la palette claire est en cours de conception.",
    icon: Sun,
    available: false,
  },
];

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <section data-settings-section-id="theme">
        <h2 className="text-lg font-semibold mb-1">Thème</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Choisissez l'apparence générale de l'application.
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {THEME_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = theme === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={!option.available}
                onClick={() => option.available && setTheme(option.value)}
                className={cn(
                  'relative flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all duration-200',
                  option.available
                    ? 'cursor-pointer hover:border-primary/50'
                    : 'cursor-not-allowed opacity-50',
                  isActive ? 'border-primary bg-primary/5' : 'border-border/50 bg-card',
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <Icon className="w-5 h-5 text-muted-foreground" />
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
