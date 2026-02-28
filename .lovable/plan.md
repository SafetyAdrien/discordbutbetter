

# Uniformiser le style de selection des salons mobile/desktop

## Probleme

Sur desktop, les salons utilisent la classe CSS `.channel-item` definie dans `index.css` qui applique un fond arrondi (`rounded-md`, `bg-muted`) quand le salon est actif. Sur mobile, les boutons de salon n'utilisent pas cette classe et n'ont aucun etat de selection visible (pas de fond, pas d'arrondi).

## Solution

Modifier `MobileChannelListView.tsx` pour utiliser la classe `.channel-item` et `.channel-item.active` comme le desktop, en ajoutant un tracking du salon selectionne.

## Changements

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

1. **Tracker le salon actif** : Ajouter un state `activeChannelId` qui se met a jour quand un salon est selectionne (avant d'appeler `onChannelSelect`).

2. **Remplacer les classes des boutons de salon** (orphelins et dans les categories) :
   - Remplacer les classes inline par la classe `channel-item` + `active` conditionnelle
   - Avant : `"w-full flex items-center gap-2 px-4 py-2.5 hover:bg-muted/50 transition-colors"`
   - Apres : `cn("channel-item w-full", activeChannelId === ch.id && "active")`

Cela appliquera automatiquement le meme `rounded-md`, `bg-muted`, `hover:bg-surface-hover` et les ajustements responsifs deja definis dans `index.css`.

## Fichier modifie

| Fichier | Changement |
|---------|-----------|
| `src/components/mobile/MobileChannelListView.tsx` | Utiliser la classe `channel-item` avec etat `active` sur les boutons de salon |

