

## Problème

Dans `AnnouncementChannel.tsx`, le spine (ligne L) qui relie le message à l'embed du fil est dessiné manuellement avec 2 `div` (lignes 807-812) :
```tsx
<div className="absolute left-0 top-0 w-0.5 bg-muted-foreground/30 h-[calc(100%-14px)]" />
<div className="absolute left-0 bottom-[6px] w-[22px] h-[12px] border-l-2 border-b-2 border-muted-foreground/30 rounded-bl-lg" />
```

Tandis que `ChatArea.tsx` utilise le composant SVG `<ThreadSpine startY={44} />` qui dessine une seule courbe quadratique fluide (vertical → arrondi → horizontal). Résultat : la liaison dans les annonces est plus courte, plus rigide et visuellement incohérente avec celle des salons textuels (capture d'écran fournie).

De plus, le wrapper de l'embed dans les annonces (`mt-1 ml-[52px]`) diffère de celui de `ChatArea` (`pt-1.5 pl-[50px]`), ce qui décale légèrement l'alignement horizontal de l'embed avec la fin du spine.

## Solution

Aligner `AnnouncementChannel` sur le pattern exact de `ChatArea` :

### Fix #1 — Remplacer le spine manuel par `<ThreadSpine />`
Lignes 806-812, remplacer le bloc des 2 `div` par le composant SVG existant :
```tsx
{threadsByMessageId.has(message.id) && <ThreadSpine startY={44} />}
```

### Fix #2 — Aligner le wrapper de l'embed
Lignes 958-965, remplacer `mt-1 ml-[52px]` par `pt-1.5 pl-[50px]` (identique à `ChatArea` ligne 1602).

### Imports à ajouter en haut du fichier
```tsx
import { ThreadSpine } from "@/components/threads/ThreadSpine";
```

(`ThreadSystemMessage` est déjà importé.)

## Garantie "ne casse rien"
- `ThreadSpine` mesure dynamiquement la position de **l'embed du fil** (dernier enfant du parent `relative`). Comme l'embed est rendu juste après le bloc `flex gap-3 items-start` à l'intérieur du même `<div className="relative">`, il sera bien le dernier enfant → mesure correcte.
- Le branch grouped (no-author, ligne 967+) n'a actuellement **aucun rendu d'embed de fil**, on n'y touche pas (comportement inchangé).
- Aucun changement de logique métier, uniquement présentation visuelle de la liaison.

## Fichier modifié

- `src/components/channels/AnnouncementChannel.tsx`
  - Ajouter l'import `ThreadSpine`
  - Lignes 806-812 → utiliser `<ThreadSpine startY={44} />`
  - Lignes 958-965 → wrapper `pt-1.5 pl-[50px]`

## Résultat

La ligne horizontale (L curve) reliant un message d'annonce à son embed de fil devient **strictement identique** à celle des messages système de fil dans les salons textuels : même courbe SVG arrondie, même couleur, même alignement.

