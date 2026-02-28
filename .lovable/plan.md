

# Adaptation mobile multi-ecrans Android/iOS

## Probleme principal

Le bouton FAB "Nouveau message" (`absolute bottom-4 right-4` = 16px du bas) est masque par la barre de navigation mobile (`fixed bottom-0` avec `mb-3` = 12px de marge + `h-14` = 56px de hauteur + safe area). Le FAB doit etre repositionne au-dessus de la nav bar.

## Corrections a apporter

### 1. `index.html` -- Viewport meta pour iOS safe areas

Ajouter `viewport-fit=cover` au meta viewport pour que `env(safe-area-inset-bottom)` fonctionne sur iOS :

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### 2. `src/components/mobile/MobileHomeView.tsx` -- Repositionner le FAB

Changer le positionnement du bouton FAB de `bottom-4` a `bottom-20` (80px) pour le placer au-dessus de la barre de navigation (qui fait ~68px avec marges). Ajouter aussi `mb-safe` pour iOS.

```tsx
// Avant
className="absolute bottom-4 right-4 ..."

// Apres  
className="absolute bottom-20 right-4 ..."
```

### 3. `src/components/mobile/MobileBottomNav.tsx` -- Meilleur support safe areas

Actuellement la nav utilise `pb-safe` mais la hauteur totale peut varier. Ajuster pour que le contenu principal sache exactement combien d'espace reserver :
- Remplacer `fixed bottom-0 mx-3 mb-3` par une approche qui inclut la safe area dans le calcul
- Ajouter une classe CSS variable pour la hauteur totale de la nav

### 4. `src/components/mobile/MobileLayout.tsx` -- Padding bas pour le contenu

Le contenu principal doit avoir un padding-bottom suffisant pour ne pas etre cache derriere la nav bar fixe. Ajouter `pb-[80px]` quand la nav est visible (quand `mobileView.type === 'tab'` et pas de DM actif).

### 5. `src/index.css` -- Utilitaires supplementaires pour ecrans varies

Ajouter des media queries supplementaires pour les petits ecrans Android (320px-360px) et les grands ecrans iOS (428px+) :
- Reduire les paddings sur les tres petits ecrans
- Ajuster les tailles de police pour les ecrans < 360px
- Ajouter `min-h-[env(safe-area-inset-bottom)]` comme fallback

### 6. `src/hooks/useBreakpoint.ts` -- Ajouter detection de taille fine

Ajouter `isSmallMobile` (< 375px) pour les petits Android (Galaxy A series, etc.) afin de pouvoir adapter les composants pour ces ecrans etroits.

## Resume des fichiers

| Fichier | Action |
|---------|--------|
| `index.html` | Ajouter `viewport-fit=cover` |
| `src/components/mobile/MobileHomeView.tsx` | Repositionner FAB a `bottom-20` |
| `src/components/mobile/MobileBottomNav.tsx` | Ameliorer safe area support |
| `src/components/mobile/MobileLayout.tsx` | Ajouter padding bas pour le contenu |
| `src/hooks/useBreakpoint.ts` | Ajouter `isSmallMobile` |
| `src/index.css` | Media queries petits ecrans |

