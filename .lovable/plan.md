

## Compréhension

Deux problèmes à régler :

1. **Effet de fondu manquant** : au-dessus du composer, les messages doivent progressivement perdre en opacité (fade-out vers le bas) pour suggérer visuellement que la zone derrière le composer est moins lisible — un dégradé doux, pas une coupure nette.

2. **Régression `pb-24`** : le padding-bottom statique pousse les messages vers le haut même quand la conversation est courte. Sur la capture, le message système "Thread créé" est coincé sous le composer et inaccessible. Il faut que la liste de messages s'aligne naturellement en bas quand il y a peu de contenu (le composer ne doit pas masquer les derniers messages dans ce cas).

## Solution

### A. Fade-out progressif au-dessus du composer

Ajouter un overlay en `absolute` juste au-dessus du composer, avec un dégradé vertical du transparent (haut) vers `bg-background` (bas), `pointer-events-none`, hauteur ~80-100px. Cela crée le fondu visuel demandé sans masquer le contenu — l'utilisateur voit le texte s'estomper avant d'atteindre la carte de saisie.

```tsx
<div className="absolute bottom-[88px] left-0 right-0 h-20 bg-gradient-to-b from-transparent to-background pointer-events-none z-[5]" />
```

Placé entre la zone scrollable (z-0) et le composer (`z-10`).

### B. Corriger l'accès aux messages quand peu de contenu

Le `pb-24` actuel sur la zone scrollable garantit que le dernier message ne soit pas masqué **quand il y a beaucoup de contenu**. Mais quand la liste est courte (cas de la capture : juste un message système "Thread créé"), ce padding la fait flotter en haut, hors de portée.

**Fix** : utiliser `flex flex-col justify-end` sur le conteneur interne de la liste de messages (déjà le cas dans la plupart des layouts type chat) **+ marge bottom auto sur la liste** pour qu'elle reste collée en bas. Le `pb-24` est conservé mais devient inoffensif car la liste s'aligne en bas naturellement, donc le dernier message reste **au-dessus** du composer même quand il n'y en a qu'un seul.

Concrètement dans `ChatArea.tsx` et `AnnouncementChannel.tsx` :
- Vérifier le wrapper interne du `ScrollArea` qui contient la liste — s'il n'a pas `min-h-full flex flex-col justify-end`, l'ajouter.
- Garder `pb-24` (espace réservé sous le dernier message pour que le composer ne le couvre pas).

Sur la capture, le système "Thread" est masqué car la liste s'aligne en haut + `pb-24` la pousse encore plus haut → invisible. Avec `justify-end` + `min-h-full`, elle se collerait naturellement juste au-dessus du composer.

## Fichiers modifiés

### `src/components/chat/ChatArea.tsx`
1. Ajouter l'overlay dégradé `absolute bottom-[88px] h-20 bg-gradient-to-b from-transparent to-background pointer-events-none z-[5]` juste avant le wrapper du composer.
2. Ajouter `min-h-full flex flex-col justify-end` au conteneur interne de la liste de messages à l'intérieur du `ScrollArea` (le `<div>` qui wrappe le `.map` des messages).

### `src/components/channels/AnnouncementChannel.tsx`
Mêmes deux ajustements.

## Garanties « ne casse rien »

- L'overlay dégradé est `pointer-events-none` → n'intercepte aucun clic.
- `justify-end` + `min-h-full` est le pattern standard chat (Discord, Slack) : liste courte collée en bas, liste longue scrolle normalement.
- `pb-24` conservé → marge de sécurité sous le dernier message dans tous les cas.
- Aucun changement sur DM, Threads, Voice.
- Aucun token CSS / Tailwind config touché.

## Hors-scope
- DM, Threads, Voice (non demandés).
- Hauteur dynamique de l'overlay selon la taille du composer (le composer peut grandir jusqu'à 280px ; on garde un overlay de hauteur fixe 80px positionné juste au-dessus de la carte fermée — acceptable visuellement).

