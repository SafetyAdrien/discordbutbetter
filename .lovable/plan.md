

# Ajustements visuels des salons

## Changements

**1. `src/components/layout/ChannelList.tsx`** — Supprimer l'effet hover des icônes d'action
- Les icônes (Settings, UserPlus, MessageSquare) dans le `group-hover:flex` ont un `hover:text-foreground` individuel — le retirer pour qu'elles restent en `text-muted-foreground` sans changement de couleur au survol.

**2. `src/index.css`** — Unifier la teinte active avec le hover
- Actuellement :
  - Hover : `hsl(var(--surface-hover) / 0.4)` 
  - Active : `hsl(var(--primary) / 0.12)` (teinte bleutée différente)
- Remplacer le background de `.channel-item.active` par `hsl(var(--surface-hover) / 0.4)` — même teinte que le hover, pour une transition visuelle cohérente.

2 fichiers modifiés.

