## Objectif

1. Le canvas d'édition de la miniature doit être **parfaitement carré** (1:1), pour correspondre exactement aux cartes de jour du calendrier (`aspect-square`).
2. Au chargement, le rectangle de redimensionnement doit épouser la **forme réelle** de l'image importée (mode "contain" et non "cover"), pour que les poignées entourent l'image telle qu'elle est, sans la rogner d'office.

## Changements

### `src/components/channels/calendar/ThumbnailCanvasEditor.tsx`

- Passer `aspect` par défaut de `21 / 9` à `1` (cadre carré).
- Réduire `exportWidth` par défaut (ex. `1024`) puisque la sortie est désormais carrée.
- Remplacer l'initialisation "cover" par un **"contain"** :
  - si `imgRatio > frameRatio` → `w = frameSize.w; h = w / imgRatio`
  - sinon → `h = frameSize.h; w = h * imgRatio`
  - centrer `(tx, ty)` dans le cadre.
- Conséquence : le rectangle initial (et donc les poignées) reflète exactement la forme de l'image, sans débordement. La logique de resize symétrique + verrou de proportions reste inchangée et continue d'utiliser `img.naturalWidth / img.naturalHeight`.

### `src/components/channels/calendar/ChannelEventModal.tsx`

- L'aperçu de la miniature posée (ligne ~209) passe de `aspect-[21/9]` à `aspect-square` pour rester cohérent avec le rendu réel dans les cartes du calendrier.

### `src/components/channels/CalendarChannel.tsx`

- L'aperçu dans le panneau de détails (ligne 459) passe de `aspect-[21/9]` à `aspect-square` afin que ce que l'utilisateur voit dans l'éditeur, dans la carte du jour et dans le détail soient strictement identiques.

## Hors-scope

- Logique de transparence (`sourceMayHaveTransparency`, PNG vs JPEG) inchangée.
- Verrou de proportions, resize symétrique, drag-to-move inchangés.
- Pas de changement backend / schéma.
