## Suppression de la micro-animation de fin de drag des catégories

### Contexte
L'utilisateur souhaite que le réordonnement des catégories soit totalement instantané, sans la moindre animation visible à la fin du drag.

### Diagnostic
La micro-animation résiduelle provient du **layout transition par défaut de `@dnd-kit/sortable`** : quand une catégorie est déposée, dnd-kit anime le glissement des autres catégories vers leur nouvelle position avec une transition CSS implicite (~200-250 ms). Même si `dropAnimation={null}` est défini sur le `DragOverlay`, le `useSortable` appliqué à chaque item continue de produire cette animation de réorganisation.

### Modifications prévues

#### 1. Désactiver la transition de layout sur les catégories (`ChannelList.tsx`)
Dans le `useSortable` des catégories (header), passer explicitement `transition: null` dans les options du hook :

```tsx
const { ... } = useSortable({
  id: `category-${category.id}`,
  data: { type: "category", categoryId: category.id },
  transition: null, // ← supprime l'animation de réorganisation
});
```

En conséquence, supprimer la ligne `transition: undefined` de l'objet `style` inline qui ne sert plus.

#### 2. Nettoyer les transitions inline des headers de catégorie
Retirer les transitions CSS inline sur le header de catégorie qui peuvent produire un effet visuel résiduel pendant le drag/release :
- `transition: 'color 300ms ...'` (ligne ~306)
- `transition: 'transform 300ms ...'` sur le chevron (ligne ~316)

Remplacer par des classes Tailwind statiques ou simplement supprimer la propriété `style` concernée.

#### 3. Nettoyage CSS
Supprimer la classe `.dnd-sortable-transition` de `src/index.css` (lignes 54-57) qui n'est utilisée nulle part et ne sert plus.

### Résultat attendu
- À la fin du drag d'une catégorie, les éléments se repositionnent **immédiatement** sans interpolation.
- Aucune micro-animation de couleur, rotation de chevron, ou transform n'est visible.
- Le comportement des salons (channels) n'est **pas** modifié — ils conservent leur propre logique DnD.

### Fichiers concernés
- `src/components/layout/ChannelList.tsx`
- `src/index.css`