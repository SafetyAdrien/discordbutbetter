

## Objectif
Ajouter un dégradé/flou en bas de la zone de messages (juste au-dessus de la zone de saisie) pour que les messages qui défilent vers le haut s'estompent doucement derrière le composer — effet "frosted edge" iOS-style. À appliquer sur les 3 surfaces de conversation.

## Surfaces ciblées
1. **Salons textuels** → `src/components/chat/ChatArea.tsx` (utilise `MessageInput`)
2. **Salons d'annonce** → `src/components/channels/AnnouncementChannel.tsx` (utilise `AnnouncementComposer`)
3. **Forum Posts / Fils** → `src/components/threads/ThreadView.tsx` (utilise `MessageInput`)

> Note : `ForumChannel.tsx` n'a pas de composer (liste de sujets), donc rien à faire dessus.

## Approche

Insérer un overlay positionné en absolu **dans le conteneur du composer** (le `flex-shrink-0` parent de l'input), aligné sur le **haut** de cette zone, qui dépasse vers le haut sur ~40px pour recouvrir le bas de la zone de messages.

```tsx
{/* Fade/blur edge above composer */}
<div
  aria-hidden
  className="pointer-events-none absolute left-0 right-0 -top-10 h-10 z-[1]
             bg-gradient-to-b from-transparent to-[hsl(var(--surface-2)/0.95)]
             [mask-image:linear-gradient(to_bottom,transparent,black_70%)]
             backdrop-blur-[2px]"
/>
```

- `from-transparent → to-surface-2/0.95` : fondu progressif vers la couleur de fond du salon
- `backdrop-blur-[2px]` : léger flou des messages qui passent dessous
- `mask-image` : le flou s'efface en haut pour ne pas créer de coupure brutale
- `pointer-events-none` : n'intercepte aucun clic
- `-top-10 h-10` : déborde de 40px au-dessus du conteneur de saisie

## Modifications par fichier

### 1. `src/components/chat/ChatArea.tsx` (~ligne 1894)
Ajouter `relative` au `<div className="flex-shrink-0 w-full px-4 pb-4 pt-2 ...">` et insérer l'overlay en premier enfant.

### 2. `src/components/channels/AnnouncementChannel.tsx` (~ligne 1094)
Idem sur `<div className="flex-shrink-0 w-full px-4 pb-4 pt-2">`.

### 3. `src/components/threads/ThreadView.tsx` (~ligne 941)
Idem sur `<div className="px-4 pb-4 pt-2">` (ajouter `relative`).

## Garanties "ne casse rien"
- Aucun changement à la logique d'envoi/scroll/rendu
- `pointer-events-none` → ne bloque pas le scroll, le clic sur les messages, ni le focus du composer
- `z-[1]` reste sous tout overlay modal/popover (qui sont en `z-50+`)
- Couleur de fade `--surface-2` cohérente avec le fond `bg-[hsl(var(--surface-2)/0.3)]` des 3 surfaces
- Effet purement visuel et identique sur les 3 surfaces (Texte, Annonce, Fil)

## Résultat
Quand l'utilisateur fait défiler les messages vers le haut, les messages les plus bas disparaissent en douceur derrière un voile flouté/dégradé juste au-dessus du composer, au lieu d'une coupure nette.

