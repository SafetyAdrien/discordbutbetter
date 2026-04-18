

## Problème
Actuellement, seule une fine bande de 24px (`-top-6 h-6`) au-dessus de l'input applique un léger flou (`backdrop-blur-[2px]`). Le conteneur d'input lui-même a un fond opaque (`bg-background` hérité) qui masque les messages dessous. L'utilisateur souhaite que le fond du conteneur d'input soit **transparent + flouté**, de sorte que les messages qui défilent en arrière-plan transparaissent en flou.

## Solution
Pour que le flou fonctionne, il faut :
1. **Rendre le conteneur d'input transparent** (retirer tout `bg-background` opaque) et appliquer `backdrop-blur` directement dessus.
2. **Permettre aux messages de défiler sous l'input** : la `ScrollArea` doit s'étendre derrière le composer, avec un `padding-bottom` suffisant pour que le dernier message reste lisible au repos.
3. **Renforcer le flou** dans la zone gradient au-dessus pour une transition douce.

### Approche par fichier

Pour chacun des 3 fichiers (`ChatArea.tsx`, `AnnouncementChannel.tsx`, `ThreadView.tsx`) :

**A. Conteneur d'input** — actuellement `flex-shrink-0` dans un layout flex (donc occupe sa place et pousse le scroll). Le rendre **superposé en absolute** au-dessus de la ScrollArea casserait beaucoup de logique (scroll-to-bottom, layout). 

Plutôt, **garder le flow flex** mais :
- Remplacer le fond opaque par `bg-background/40 backdrop-blur-xl` sur le conteneur d'input
- Augmenter la zone gradient supérieure de `h-6` (24px) à `h-12` (48px) avec `backdrop-blur-md` pour un fondu progressif
- Ainsi les messages **directement au-dessus** du composer seront vus à travers le flou de la zone gradient (qui déborde sur la ScrollArea via `-top-12`)

**B. Conteneur lui-même** — son fond devient flou translucide :
```tsx
<div className="relative flex-shrink-0 w-full px-4 pb-4 pt-2 bg-background/60 backdrop-blur-xl">
```

**C. Zone gradient (transition au-dessus)** — agrandie et plus floutée :
```tsx
<div className="pointer-events-none absolute -top-12 left-0 right-0 h-12 bg-gradient-to-b from-transparent to-background/60 backdrop-blur-md [mask-image:linear-gradient(to_bottom,transparent,black)]" />
```

Cette bande de 48px déborde au-dessus du composer et floute progressivement les messages qui passent derrière, créant l'effet "frosted glass" attendu.

## Garantie "ne casse rien"
- Aucune modification du layout flex (le composer reste `flex-shrink-0`, pas d'absolute)
- ScrollArea, scroll-to-bottom, MessageInput, replyingTo : intacts
- Seules 2 classes modifiées par fichier (conteneur + overlay)
- Le `bg-background/60` reste assez opaque pour garantir la lisibilité du composer

## Fichiers modifiés
- `src/components/chat/ChatArea.tsx` (lignes 1895-1896)
- `src/components/channels/AnnouncementChannel.tsx` (lignes 1094-1095)
- `src/components/threads/ThreadView.tsx` (lignes 941-942)

## Résultat
Les messages qui défilent juste au-dessus de la zone composer apparaissent floutés (frosted glass) sur 48px, et le composer lui-même a un fond translucide flouté — exactement comme un effet iOS/macOS de barre flottante.

