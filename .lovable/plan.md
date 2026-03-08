

# Deux ajustements UI

## 1. Fond sur l'icône d'invitation (ChannelList header)

**Fichier** : `src/components/layout/ChannelList.tsx` — ligne 1545

Actuellement le bouton d'invitation n'a pas de fond au repos (`hover:bg-surface-3` seulement). La barre de recherche utilise `bg-surface-3`. On ajoute `bg-surface-3` au repos sur le bouton d'invitation pour matcher visuellement.

```tsx
// Avant
className="p-2 rounded-full hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"

// Après
className="p-2 rounded-full bg-surface-3 hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
```

## 2. Surélever le ThreadView en split-view

**Fichier** : `src/components/threads/ThreadView.tsx` — ligne 382

Ajouter un `z-10` au conteneur principal du ThreadView pour qu'il passe visuellement au-dessus de la zone de chat lorsqu'on est en split-view (grâce au shadow existant `-4px_0_12px`).

```tsx
// Avant
className="h-full flex flex-col bg-[hsl(var(--surface-2)/0.3)] border-l-2 border-border/70 shadow-[-4px_0_12px_rgba(0,0,0,0.15)] min-w-0"

// Après
className="h-full flex flex-col bg-[hsl(var(--surface-2)/0.3)] border-l-2 border-border/70 shadow-[-4px_0_12px_rgba(0,0,0,0.15)] min-w-0 z-10"
```

**2 fichiers modifiés, 1 ligne chacun.**

