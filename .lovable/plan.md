

# Fix du hover sur le message système des Threads

## Problème
Le message système (la ligne parent avec `message-hover`) et l'embed du thread à l'intérieur utilisent des teintes trop proches :
- **Parent hover** : `hsl(var(--surface-hover) / 0.25)` 
- **Embed normal** : `hsl(var(--surface-2) / 0.5)` → **Embed hover** : `hsl(var(--surface-2) / 0.8)`

Quand on survole la ligne, les deux fonds se confondent — on ne distingue plus l'embed du reste.

## Solution
Augmenter le contraste de l'embed thread pour qu'il ressorte clairement, même quand le parent est en hover. Passer l'embed à `surface-3` (plus clair que `surface-2`) :

| Fichier | Changement |
|---------|-----------|
| `ThreadSystemMessage.tsx` L77 | `bg-[hsl(var(--surface-2)/0.5)] hover:bg-[hsl(var(--surface-2)/0.8)]` → `bg-[hsl(var(--surface-3)/0.4)] hover:bg-[hsl(var(--surface-3)/0.7)]` |

Un seul fichier modifié, une seule ligne.

