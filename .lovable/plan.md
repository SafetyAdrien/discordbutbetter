

# Suppression du systeme d'icones personnalisees de salon

## Portee

Retirer toute la logique d'upload, d'affichage et de gestion des icones personnalisees de salons (`icon_url` sur les channels), tout en preservant les icones par defaut (hash, voice, forum, etc.) et les autres systemes d'icones (serveurs, roles, etc.).

La colonne `icon_url` en base de donnees sera conservee (nullable, deja en place) pour eviter toute migration destructive. On supprime uniquement le code cote client.

## Fichiers a modifier

### 1. `src/components/channel-settings/ChannelOverview.tsx`
- Supprimer tous les imports et etats lies a l'icone : `iconUrl`, `isUploading`, `fileInputRef`, `pendingFile`, `previewUrl`, `cropperOpen`, `cropperSrc`, `pendingFileType`, `displayIcon`
- Supprimer les fonctions `handleIconUpload`, `handleCropComplete`, `handleRemoveIcon`
- Supprimer l'upload vers le bucket `channel-icons` dans `handleSave`
- Supprimer le composant `ImageCropper` et les imports associes (`Upload`, `X`, `Loader2` pour l'upload, `ImageCropper`, `supabase`)
- Retirer `icon_url` de la detection `hasChanges` et de l'appel `updateChannel.mutateAsync`
- Remplacer le bloc "icone cliquable + input file" par une simple icone de type statique (le `TypeIcon` existant, non cliquable)
- Conserver tout le reste : edition du nom, description, toggle type, bouton sauvegarder

### 2. `src/components/layout/ChannelList.tsx`
- Ligne ~432 : supprimer `const hasCustomIcon = !!channel.icon_url;`
- Ligne ~469-471 : supprimer le rendu conditionnel `hasCustomIcon ? <img ...> : <DefaultIcon ...>` et garder uniquement `<DefaultIcon ...>`
- Ligne ~1429-1431 : meme chose, supprimer le rendu conditionnel sur `channel?.icon_url` et garder uniquement le `<FallbackIcon ...>`

### 3. `src/hooks/useChannelSettings.ts`
- Retirer `icon_url` de l'interface `ChannelDetails` (ligne 16)
- Retirer `icon_url` du select dans la query (ligne 54)
- Retirer `icon_url` du type et de la logique de `useUpdateChannel` (parametre, updateData, optimistic updates)

### 4. `src/hooks/useChannels.ts`
- Retirer `icon_url` de l'interface `ChannelWithCategory` (ligne 17)
- Retirer `icon_url` du select dans la query (ligne 110)

## Ce qui n'est PAS touche

- La colonne `icon_url` dans la table `channels` en base (pas de migration)
- Les icones de serveur (`server.icon_url`), de roles (`role.icon_url`), de DM (`conversation.icon_url`) -- tout cela reste intact
- Les icones par defaut des types de salons (hash, voice, forum, etc.)
- Le bucket de stockage `channel-icons` (il restera vide desormais)
- Aucun autre composant ou hook

## Risques et precautions

- Les references a `channel.icon_url` dans `ChannelList.tsx` devront etre supprimees proprement pour eviter des erreurs TypeScript une fois le champ retire de l'interface
- Le `useUpdateChannel` ne passera plus `icon_url` du tout, donc les anciennes valeurs en base resteront mais ne seront plus affichees ni modifiables

