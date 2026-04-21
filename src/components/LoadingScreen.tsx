import { useState, useEffect, useMemo } from 'react';
import { ParticleBackground } from '@/components/effects/ParticleBackground';
import { useReducedMotion } from '@/hooks/useReducedMotion';

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

interface LoadingScreenProps {
  progress?: number;
  currentStep?: string;
}

export default function LoadingScreen({ progress = 0, currentStep }: LoadingScreenProps) {
  const phrase = useMemo(() => motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)], []);
  const tip = useMemo(() => tips[Math.floor(Math.random() * tips.length)], []);
  const reducedMotion = useReducedMotion();
  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches,
    []
  );
  const showParticles = !reducedMotion;
  const particleCount = isMobile ? 14 : 30;
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="h-screen flex flex-col items-center justify-center bg-background text-foreground gap-8 select-none relative overflow-hidden"
      role="status"
      aria-busy="true"
      aria-label={currentStep ? `Chargement, ${currentStep}` : 'Chargement de l\'application'}
    >
      {/* Canvas particle background */}
      <ParticleBackground count={40} speed={0.3} />

      {/* Logo with pulse animation */}
      <div className="relative z-10">
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
      <div className="flex flex-col items-center gap-2 z-10">
        <p className="text-lg font-semibold text-foreground tracking-wide">
          Chargement{dots}
        </p>
        <p className="text-sm text-muted-foreground italic max-w-xs text-center">
          {phrase}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-64 flex flex-col items-center gap-2 z-10">
        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.max(progress, 5)}%` }}
          />
        </div>
        {currentStep && (
          <p className="text-xs text-muted-foreground">
            {currentStep}...
          </p>
        )}
      </div>

      {/* Tip */}
      <div className="absolute bottom-8 px-6 max-w-md text-center z-10">
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-primary">ASTUCE</span>
          {' — '}
          {tip}
        </p>
      </div>
    </div>
  );
}
