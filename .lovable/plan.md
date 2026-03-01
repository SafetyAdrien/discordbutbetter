

# Ajout de la suppression rapide dans les menus d'appui long

## Objectif

Ajouter un bouton "Supprimer" dans les menus contextuels (appui long) des categories et des salons sur mobile, avec une confirmation via AlertDialog avant suppression.

## Changements

### Fichier : `src/components/mobile/MobileChannelListView.tsx`

1. **Imports supplementaires** :
   - Importer `Trash2` depuis `lucide-react`
   - Importer `useDeleteChannel` et `useDeleteCategory` depuis `@/hooks/useChannels`
   - Importer `toast` depuis `sonner`

2. **Ajouter deux states pour les confirmations de suppression** :
   - `deletingCategoryId` (string | null) : ID de la categorie a supprimer
   - `deletingChannelId` (string | null) : ID du salon a supprimer

3. **Instancier les hooks de suppression** dans le composant principal :
   - `const deleteChannel = useDeleteChannel();`
   - `const deleteCategory = useDeleteCategory();`

4. **Ajouter un bouton "Supprimer" dans le PopoverContent des categories** (apres le bouton "Modifier la categorie", ligne ~497) :
   - Bouton rouge avec icone `Trash2` et texte "Supprimer la categorie"
   - Au clic : ferme le popover (`setLongPressedCategoryId(null)`) et ouvre la confirmation (`setDeletingCategoryId(cat.id)`)

5. **Ajouter un bouton "Supprimer" dans les deux PopoverContent des salons** (orphelins ligne ~446 et dans categories ligne ~552) :
   - Bouton rouge avec icone `Trash2` et texte "Supprimer le salon"
   - Au clic : ferme le popover et ouvre la confirmation (`setDeletingChannelId(ch.id)`)

6. **Ajouter deux AlertDialog de confirmation** en bas du composant (avant la fermeture du `</div>` principal) :

   **Pour les categories :**
   - Titre : "Supprimer la categorie"
   - Description : "Tu es sur(e) de vouloir supprimer cette categorie ? Cette action est irreversible."
   - Bouton "Annuler" et bouton "Supprimer" (destructive, avec Loader2 si en cours)
   - Action : appelle `deleteCategory.mutateAsync({ categoryId, serverId })`, affiche toast de succes/erreur

   **Pour les salons :**
   - Meme structure avec `deleteChannel.mutateAsync({ channelId, serverId })`

### Detail technique

Les noms de la categorie/salon a supprimer seront resolus a partir des props `categories` et `orphanChannels` en cherchant par ID. Le pattern de confirmation suit celui deja utilise dans `ChannelDangerZone` et `CategoryDangerZone` mais avec un `AlertDialog` (plus adapte au mobile) plutot qu'un `Dialog`.

