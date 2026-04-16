

# Correctif : icon_url non propagé dans la liste des salons

## Problème

Dans `useChannelSettings.ts`, la mutation `useUpdateChannel` :
1. **`onMutate`** (ligne 103) ne destructure pas `icon_url` des paramètres
2. **`updateChannel`** (ligne 122-125) ne propage pas `icon_url` dans le cache `['channels', serverId]`
3. **`mutationFn` return** (ligne 101) n'inclut pas `icon_url`, donc `onSettled` ne peut pas le transmettre

L'icône est bien sauvegardée en DB mais le cache React Query de la liste des salons n'est jamais mis à jour optimistiquement, et le realtime met ~300ms avant d'invalider.

## Solution

Dans `src/hooks/useChannelSettings.ts` :

1. **Ligne 103** — Ajouter `icon_url` dans la destructuration de `onMutate` :
   ```ts
   onMutate: async ({ channelId, serverId, name, description, type, icon_url }) => {
   ```

2. **Lignes 112-118** — Inclure `icon_url` dans le cache `channel-details` :
   ```ts
   icon_url: icon_url !== undefined ? icon_url : previousDetails.icon_url,
   ```

3. **Lignes 122-125** — Inclure `icon_url` dans le `updateChannel` pour le cache `['channels', serverId]` :
   ```ts
   const updateChannel = (ch: any) =>
     ch.id === channelId
       ? { ...ch, name, description: description ?? ch.description, type: type ?? ch.type, ...(icon_url !== undefined && { icon_url }) }
       : ch;
   ```

4. **Ligne 145** — Inclure `icon_url` dans le cache `['servers']` aussi.

## Fichier modifié
- `src/hooks/useChannelSettings.ts`

