## Plan

### Objective
Lors d'un drag (salons et catégories), l'élément visuel en déplacement ne doit afficher **que le texte** : aucun background color, aucune border color, aucune ombre, aucun scale, aucun backdrop.

### Changes

#### 1. `src/components/layout/ChannelList.tsx` — DragOverlay simplifié
Remplacer le wrapper du `DragOverlay` (lignes ~1854-1861) par un conteneur minimal sans style visuel :
- Supprimer `bg-card/95`, `backdrop-optimized`, `border border-[#5865f2]/50`, `rounded-md`, `px-3 py-2`, `shadow-lg`, `shadow-black/30`, `scale-105`.
- Conserver uniquement les éléments textuels (nom de catégorie ou nom de salon + icône selon la demande de l'utilisateur — à confirmer si l'icône est conservée ou non).

#### 2. `src/index.css` — Classe `.dnd-item-dragging` nettoyée
Modifier la classe `.dnd-item-dragging` (lignes 797-799) pour retirer tout background/border :  
- Supprimer `bg-muted/20` et `rounded-md`.  
- Conserver `opacity-30` et `scale-[0.98]` pour que l'élément d'origine reste visible comme "placeholder" dans la liste, mais sans fond ni bordure.

### Résultat attendu
- Drag de catégorie : uniquement le nom de la catégorie visible sous le curseur.
- Drag de salon : uniquement le nom du salon (et éventuellement son icône) visible sous le curseur.
- L'élément laissé dans la liste garde une opacité réduite mais aucun fond ni bordure.

### Question de clarification
Faut-il également supprimer **l'icône** du salon dans le DragOverlay, ou seul le background/border est concerné et l'icône peut rester ?