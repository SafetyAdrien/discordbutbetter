

# Améliorer les teintes du conteneur des Sondages

## Analyse
Le sondage utilise `--poll-background: 220 18% 10%` (très sombre, proche de `surface-1` à 9%). Les options utilisent `bg-[hsl(var(--surface-2))]`. L'ensemble manque de profondeur et de cohérence avec le système de surfaces Material You.

## Changements

### 1. `src/index.css`
- Mettre à jour `--poll-background` de `220 18% 10%` vers `225 18% 12%` — entre surface-1 (9%) et surface-2 (14%), pour un fond distinct mais subtil.

### 2. `src/components/chat/PollDisplay.tsx`
- **Conteneur principal** (L240) : `bg-poll rounded-lg` → `bg-[hsl(var(--surface-1))] rounded-xl border border-border/20`  — coins plus arrondis + bordure subtile pour l'élévation Material You.
- **Options non sélectionnées** (L274) : `bg-[hsl(var(--surface-2))]` → `bg-[hsl(var(--surface-2)/0.6)]` — plus subtil, meilleur contraste avec le conteneur.
- **Options sélectionnées/votées** (L273) : `bg-primary/10` → `bg-primary/15` — légèrement plus visible.
- **Barre de progression du temps** (L339) : `bg-muted` → `bg-[hsl(var(--surface-3)/0.5)]` — cohérence avec la palette surface.
- **Avatar border** (L32) : `border-card` → `border-[hsl(var(--surface-1))]` — s'adapte au fond du poll.

**2 fichiers modifiés.**

