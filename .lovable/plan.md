
# Ajouter un menu contextuel "Modifier la catégorie" par appui long sur mobile

## Résumé

Un appui long sur le nom d'une catégorie dans la liste des salons mobile affichera une petite popup (Popover) avec l'option "Modifier la catégorie". Cliquer dessus ouvrira le `EditCategoryModal` existant (qui affiche Aperçu + Permissions, sans page Intégration).

## Détails techniques

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

**Imports à ajouter :**
- `EditCategoryModal` depuis `@/components/category-settings/EditCategoryModal`
- `useLongPress` depuis `@/hooks/useLongPress`
- `Popover`, `PopoverContent`, `PopoverTrigger` depuis `@/components/ui/popover`
- `FolderOpen` depuis `lucide-react`

**Dans le composant `MobileChannelListView` :**

1. Ajouter deux états :
   - `longPressedCategoryId: string | null` -- contrôle l'ouverture du Popover sur la catégorie ciblée
   - `editingCategory: { id: string; name: string; channelCount: number } | null` -- contrôle l'ouverture du `EditCategoryModal`

2. Modifier le rendu de chaque catégorie (ligne 381-411) :
   - Envelopper le bouton de catégorie dans un `Popover` contrôlé (`open={longPressedCategoryId === cat.id}`)
   - Attacher les handlers `useLongPress` (`onTouchStart`, `onTouchEnd`, `onTouchMove`) au bouton existant
   - Le `PopoverContent` contiendra un seul bouton "Modifier la catégorie" avec l'icône `FolderOpen`
   - Au clic sur ce bouton : fermer le Popover et ouvrir `EditCategoryModal` avec les infos de la catégorie

3. Rendre conditionnellement `EditCategoryModal` quand `editingCategory` est non-null

### Comportement

- Appui court : collapse/expand la catégorie (inchangé)
- Appui long (~500ms) : affiche le Popover avec "Modifier la catégorie"
- Clic sur "Modifier la catégorie" : ouvre le modal plein écran existant (Aperçu + Permissions)
- Le modal n'a pas de page "Intégration" (le `EditCategoryModal` n'en contient déjà pas)
