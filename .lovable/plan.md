

# Correctif : Position du salon duplique

## Probleme

Actuellement, lors de la duplication d'un salon, le nouveau salon est place a la fin de la liste (position = max + 1). Il devrait apparaitre juste en dessous du salon original.

## Solution

Modifier la fonction `useDuplicateChannel` dans `src/hooks/useChannels.ts` :

1. Utiliser la position du salon original (`original.position`) comme reference
2. Incrementer la position de tous les salons qui ont une position superieure a celle de l'original (dans la meme categorie ou parmi les orphelins) pour "faire de la place"
3. Inserer le salon duplique avec `position = original.position + 1`

### Fichier a modifier

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useChannels.ts` | Logique de positionnement dans `useDuplicateChannel` (lignes 691-723) |

### Detail technique

Remplacer le calcul de `nextPosition` (lignes 691-712) par :

1. Determiner `newPosition = (original.position ?? 0) + 1`
2. Decaler tous les salons avec `position >= newPosition` dans la meme categorie (ou les orphelins si `category_id` est null) en incrementant leur position de 1 via un `UPDATE`
3. Inserer le doublon avec `position: newPosition`

Cela garantit que le salon duplique apparait immediatement apres l'original, sans ecraser les positions existantes.

