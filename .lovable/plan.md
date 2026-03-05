

# Amélioration de la précision du drag & drop

## Analyse du comportement actuel

Le positionnement utilise un simple découpage 50/50 (moitié haute = before, moitié basse = after) sur `handleDragOver`. Cela fonctionne mais manque de finesse :

- **Catégories** : pas de distinction entre "insérer avant/après la catégorie" et "déposer un salon DANS la catégorie"
- **Salons** : le seuil 50/50 est parfois ambigu quand les éléments sont petits — on ne sait pas toujours si on insère au-dessus ou en-dessous

## Améliorations proposées

### 1. Zones proportionnelles pour les salons (30/70 au lieu de 50/50)

Remplacer le seuil `middleY` par des zones proportionnelles :
- **Top 30%** du salon cible → indicateur "before"
- **Bottom 70%** → indicateur "after"

Cela favorise l'insertion "après" qui est le comportement le plus naturel (on glisse vers le bas), rendant le drag plus intuitif.

### 2. Zones à 3 états pour les catégories (quand on drag un salon sur une catégorie)

Quand un **salon** est glissé sur un **header de catégorie** :
- **Top 25%** → indicateur "before" (insérer avant la catégorie = au-dessus)
- **Middle 50%** → highlight de la catégorie (ajouter le salon à la fin de cette catégorie)
- **Bottom 25%** → indicateur "after" (insérer après le header = en premier dans la catégorie)

Ajouter un état visuel "highlight" sur le header quand on est dans la zone médiane.

### 3. Feedback visuel amélioré sur les catégories

Quand un salon est glissé dans la zone médiane d'une catégorie, afficher un léger highlight bleu sur le header (au lieu d'un indicateur before/after) pour signifier "déposer dans cette catégorie".

## Fichier modifié

| Fichier | Changement |
|---|---|
| `src/components/layout/ChannelList.tsx` | Modifier `handleDragOver` pour les zones proportionnelles, ajouter état `dropMode` ("before"/"after"/"inside"), adapter `SortableCategory` pour le highlight "inside", adapter `handleDragEnd` pour gérer le mode "inside" |

## Détail technique

### `handleDragOver` — zones proportionnelles
```text
// Pour les salons : seuil à 30% du haut
const threshold = overRect.top + overRect.height * 0.3;
const position = clientY < threshold ? "before" : "after";

// Pour les catégories quand on drag un salon :
const topZone = overRect.top + overRect.height * 0.25;
const bottomZone = overRect.top + overRect.height * 0.75;
if (clientY < topZone) → "before"
else if (clientY > bottomZone) → "after" 
else → "inside" (nouveau mode)
```

### Nouvel état `dropMode`
```text
const [dropMode, setDropMode] = useState<"before" | "after" | "inside">("after");
```

### `SortableCategory` — highlight pour mode "inside"
```text
// Nouveau prop showInsideHighlight
{showInsideHighlight && (
  <div className="absolute inset-0 bg-[#5865f2]/10 rounded-md border border-[#5865f2]/30 pointer-events-none z-5" />
)}
```

### `handleDragEnd` — gestion du mode "inside"
```text
// Quand dropMode === "inside" et qu'on drop un salon sur une catégorie :
// → ajouter le salon à la fin de la catégorie (comportement existant)
// Quand dropMode === "before"/"after" :
// → utiliser l'insertion précise (comportement existant amélioré)
```

Un seul fichier modifié : `ChannelList.tsx`.

