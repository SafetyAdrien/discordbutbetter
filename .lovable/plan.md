

# Icône personnalisée pour les salons textuels

## Vue d'ensemble

Permettre de cliquer sur le hashtag dans les paramètres d'un salon text pour uploader une image personnalisée, la recadrer, et l'utiliser comme icône du salon. Un bouton poubelle rouge permet de retirer l'icône.

## Changements

### 1. Migration base de données
- Ajouter la colonne `icon_url TEXT` à la table `channels`
- Créer un bucket storage `channel-icons` (public) avec politique RLS pour les membres authentifiés

### 2. `src/hooks/useChannelSettings.ts`
- Ajouter `icon_url` dans `ChannelDetails`
- Ajouter `icon_url` dans la query `select`
- Ajouter `icon_url` dans `useUpdateChannel` (mutationFn + optimistic updates)

### 3. `src/components/channel-settings/ChannelOverview.tsx`
- Ajouter un état local `iconUrl` synchronisé avec `channel.icon_url`
- Remplacer le conteneur rond du hashtag (ligne 134) par un bouton cliquable :
  - Si pas d'icône : affiche le `TypeIcon` avec un curseur pointer et un overlay hover "Modifier"
  - Si icône : affiche l'image dans un cercle
- Au clic : ouvrir un `<input type="file" accept="image/*">` caché
- Après sélection : ouvrir le composant `ImageCropper` existant (aspect 1:1, circularCrop)
- Après crop : uploader le blob dans le bucket `channel-icons`, mettre à jour `icon_url` via `useUpdateChannel`
- Ajouter un bouton `Trash2` rouge à côté quand une icône est définie, qui supprime l'icône (set `icon_url` à `null`)

### 4. `src/components/layout/ChannelList.tsx`
- Ligne ~677 : si le channel a un `icon_url`, afficher un `<img>` rond (w-4 h-4) au lieu du `DefaultIcon`

### 5. `src/hooks/useChannels.ts`
- Vérifier que `icon_url` est inclus dans les queries existantes pour que ChannelList y ait accès

## Fichiers impactés
- **Migration** : nouvelle colonne + bucket storage
- **Modifier** : `useChannelSettings.ts`, `ChannelOverview.tsx`, `ChannelList.tsx`, `useChannels.ts`

