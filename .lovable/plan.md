

# Retirer la ligne verticale du spine dans le message système thread

## Problème

La spine du message système de création de thread comporte une ligne verticale (ligne 1306) qui descend avant la courbe. Cette ligne n'a de sens que quand plusieurs threads sont empilés (liste de threads dans le channel list), mais pour un message système isolé, seule la courbe en L suffit.

## Plan

### `src/components/chat/ChatArea.tsx` — ligne 1306

Supprimer la ligne verticale (`<div className="absolute left-5 top-0 w-0.5 bg-muted-foreground/30" .../>`) et ne garder que la courbe. Ajuster le positionnement de la courbe pour qu'elle parte du haut du conteneur et descende vers le conteneur embed (remplacer `top-1/2 -translate-y-1/2` par `bottom-0` ou similaire pour que la courbe connecte directement le texte système au conteneur embed sans ligne verticale inutile).

| Fichier | Changement |
|---|---|
| `src/components/chat/ChatArea.tsx` | Retirer la ligne verticale du spine, ajuster la courbe |

