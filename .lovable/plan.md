

# Centrer le texte du textarea dans la barre de saisie sur mobile

## Probleme

Le texte du placeholder/saisie n'est pas centre verticalement dans le conteneur arrondi (la barre de saisie). Le textarea a du padding `py-3` qui ne correspond pas bien a la hauteur des boutons adjacents, creant un decalage visuel.

## Solution

Ajuster le padding du textarea et de l'overlay pour que le texte soit parfaitement centre dans la barre. Sur mobile, utiliser un padding vertical plus petit (`py-2.5` soit 10px) pour mieux s'aligner avec les boutons qui ont `p-3` (plus button) et `p-2` (emoji/send buttons). Egalement ajuster le padding du bouton "+" sur mobile pour uniformiser la hauteur.

## Changements

### Fichier : `src/components/chat/MessageInput.tsx`

1. **Textarea padding (ligne ~485-487)** : Changer `py-3` en `py-2.5` pour le mode non-compact afin de mieux centrer le texte dans le conteneur.

2. **Bouton plus (ligne ~427)** : Uniformiser le padding du bouton "+" pour qu'il soit coherent avec la hauteur du textarea.

### Fichier : `src/components/chat/InputMarkdownOverlay.tsx`

1. **Overlay padding (ligne ~96)** : Changer le padding non-compact de `py-3` a `py-2.5` pour rester synchronise avec le textarea.

| Fichier | Changement |
|---------|-----------|
| `src/components/chat/MessageInput.tsx` | Textarea padding `py-3` -> `py-2.5`, ajustement bouton "+" |
| `src/components/chat/InputMarkdownOverlay.tsx` | Overlay padding `py-3` -> `py-2.5` pour rester aligne |

