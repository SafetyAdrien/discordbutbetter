

## Compréhension
La zone de saisie (textuelle dans `MessageInput` et annonces dans `AnnouncementComposer`) a actuellement un fond opaque (`bg-[hsl(var(--input))]` / `bg-input`). L'utilisateur veut le remplacer par un **léger voile sombre semi-transparent** pour qu'on devine légèrement le contenu (messages) qui passe derrière en arrière-plan.

## Approche
Remplacer le fond opaque par un noir/foncé translucide + `backdrop-blur` léger pour l'effet "verre dépoli sombre" qui laisse transparaître ce qui défile derrière.

### Valeurs cibles
- Fond : `bg-black/30` (voile sombre ~30% d'opacité) au lieu de `bg-[hsl(var(--input))]` opaque
- Flou de fond : `backdrop-blur-md` pour adoucir le contenu derrière sans le rendre lisible
- Conserver la `border border-border/50`, le `rounded-2xl` et le `shadow-elevation-2` existants pour ne pas casser la silhouette du composant

## Changements précis

### 1. `src/components/chat/MessageInput.tsx`
3 occurrences à modifier (lignes ~487, ~508, ~557) — toutes les variantes du wrapper de saisie (état normal, follow bar, permission denied) :

**Avant :**
```tsx
className="... bg-[hsl(var(--input))] border border-border/50 ..."
```

**Après :**
```tsx
className="... bg-black/30 backdrop-blur-md border border-border/50 ..."
```

### 2. `src/components/channels/announcement/AnnouncementComposer.tsx`
- Ligne ~190 : wrapper principal du composer ouvert  
  `bg-input` → `bg-black/30 backdrop-blur-md`
- Ligne ~166 : bouton compact (collapsed)  
  `bg-input` → `bg-black/30 backdrop-blur-md`
- Ligne ~155 : bouton "follow"  
  `bg-input` → `bg-black/30 backdrop-blur-md`
- Ligne ~161 : message permission denied  
  `bg-input` → `bg-black/30 backdrop-blur-md`

## Garanties « ne casse rien »
- Bordure, rayon (`rounded-2xl`), ombre, padding : inchangés
- Aucun changement sur la logique d'envoi, attachments, mentions, polls, markdown overlay
- Le `bg-input` reste utilisé partout ailleurs dans l'app (inputs des modales, settings) — non touché
- Le `backdrop-blur-md` ne s'active que si quelque chose défile derrière (sinon visuellement neutre)

## Fichiers modifiés
- `src/components/chat/MessageInput.tsx` (3 classes de fond)
- `src/components/channels/announcement/AnnouncementComposer.tsx` (4 classes de fond)

