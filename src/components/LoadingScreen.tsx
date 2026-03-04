import { useState, useEffect, useMemo } from 'react';

const motivationalPhrases = [
  "Là où les communautés prennent vie.",
  "Votre espace, vos règles.",
  "Connectez-vous avec ceux qui comptent.",
  "L'aventure commence ici.",
  "Votre communauté vous attend.",
  "Ensemble, on va plus loin.",
  "Le chat nouvelle génération.",
  "Créé pour les passionnés.",
  "Bien plus qu'un simple chat.",
  "Là où chaque voix compte.",
];

const tips = [
  "Utilisez Ctrl+K pour rechercher rapidement.",
  "Shift + clic sur Supprimer pour supprimer sans confirmation.",
  "Créez des fils de discussion pour organiser vos conversations.",
  "Personnalisez votre profil avec une bannière et un avatar.",
  "Utilisez les réactions pour exprimer vos émotions rapidement.",
  "Épinglez les messages importants pour les retrouver facilement.",
  "Créez des catégories pour organiser vos salons.",
  "Utilisez les mentions @everyone avec modération.",
  "Les salons vocaux permettent de discuter en temps réel.",
  "Glissez-déposez des fichiers directement dans le chat.",
  "Personnalisez les notifications par salon.",
  "Utilisez le markdown pour mettre en forme vos messages.",
  "Les forums sont parfaits pour les discussions longues.",
  "Attribuez des rôles pour gérer les permissions.",
  "Utilisez les webhooks pour intégrer des services externes.",
];

const stepLabels: Record<string, string> = {
  auth: 'Authentification',
  servers: 'Serveurs',
  channels: 'Salons',
  members: 'Membres',
  messages: 'Messages',
};

export interface LoadingSteps {
  auth: boolean;
  servers: boolean;
  channels: boolean;
  members: boolean;
  messages: boolean;
}

interface LoadingScreenProps {
  steps?: LoadingSteps;
}

export default function LoadingScreen({ steps }: LoadingScreenProps) {
  const phrase = useMemo(() => motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)], []);
  const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], []);
  const [dots, setDots] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [mountTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
      setElapsed(Date.now() - mountTime);
    }, 500);
    return () => clearInterval(interval);
  }, [mountTime]);

  // Calculate progress from steps
  const completedCount = steps
    ? Object.values(steps).filter(Boolean).length
    : 0;
  const totalSteps = steps ? Object.keys(steps).length : 5;
  const progress = steps ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Find the current loading step label
  const currentStepLabel = useMemo(() => {
    if (!steps) return 'Chargement';
    const order: (keyof LoadingSteps)[] = ['auth', 'servers', 'channels', 'members', 'messages'];
    for (const key of order) {
      if (!steps[key]) return stepLabels[key];
    }
    return 'Finalisation';
  }, [steps]);

  const isSlowConnection = elapsed > 5000;

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-8 select-none">
      {/* Logo with pulse animation */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: '2s' }} />
        <img
          src="/pwa-192x192.png"
          alt="NexusChat"
          className="w-20 h-20 rounded-2xl animate-pulse"
          style={{ animationDuration: '1.5s' }}
          draggable={false}
        />
      </div>

      {/* Loading text */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-lg font-semibold text-foreground tracking-wide">
          {currentStepLabel}{dots}
        </p>
        <p className="text-sm text-muted-foreground italic max-w-xs text-center">
          {phrase}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex flex-col items-center gap-2 w-56">
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          {steps ? (
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          ) : (
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: '40%',
                animation: 'loading-bar 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>
        {steps && (
          <p className="text-xs text-muted-foreground tabular-nums">
            {completedCount}/{totalSteps}
          </p>
        )}
      </div>

      {/* Slow connection warning */}
      {isSlowConnection && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Connexion lente détectée — veuillez patienter…
        </p>
      )}

      {/* Tip */}
      <div className="absolute bottom-8 px-6 max-w-md text-center">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-primary">ASTUCE</span>
          {' — '}
          {tip}
        </p>
      </div>

      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(150%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
