

## Problème
Le calque flou utilise `-top-8` (32px) qui dépasse largement au-dessus du conteneur de saisie, créant un halo flou visible au-dessus du composer (visible avec la flèche rouge dans la capture). L'utilisateur veut que le flou reste **strictement contenu** dans le conteneur, avec au maximum une très légère extension (~2-4px).

## Solution
Réduire `-top-8` (32px) à `-top-1` (4px) dans les 3 fichiers. Cela garde une extension quasi-imperceptible (juste de quoi éviter une coupure nette), sans déborder visiblement au-dessus du composer.

### Changements (1 classe par fichier)

**`src/components/chat/ChatArea.tsx`** (ligne 1896)
**`src/components/channels/AnnouncementChannel.tsx`** (ligne 1095)
**`src/components/threads/ThreadView.tsx`** (ligne 942)

```diff
- <div className="pointer-events-none absolute -top-8 left-0 right-0 bottom-0 backdrop-blur-md bg-gradient-to-b from-background/0 via-background/60 to-background/85 -z-0" />
+ <div className="pointer-events-none absolute -top-1 left-0 right-0 bottom-0 backdrop-blur-md bg-gradient-to-b from-background/40 via-background/70 to-background/85 -z-0" />
```

Le dégradé démarre à `from-background/40` (au lieu de `/0`) pour que la zone d'extension de 4px ne montre pas un flou totalement transparent qui paraîtrait "flottant".

## Garantie "ne casse rien"
- Effet flou conservé (juste mieux contenu)
- Aucune logique modifiée
- Hauteurs/paddings du composer inchangés
- Lisibilité du composer préservée (gradient toujours opaque vers le bas)

## Résultat
Le flou reste visuellement collé au conteneur de saisie (fil rouge éliminé), avec juste 4px de marge haute pour une transition douce — identique pour les salons Texte, Annonces et Fils.

