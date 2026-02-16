

# Correctifs : Duplication et icone personnalisee

## Probleme 1 : Erreur lors de la duplication du salon

Le `onMutate` du hook `useDuplicateChannel` (lignes 777-804) traite le cache `['channels', serverId]` comme un tableau plat, alors que la structure reelle est un objet `{ categories: [...], orphanChannels: [...] }`.

- **Ligne 777** : `const cachedChannels = previousChannels as any[]` -- faux, c'est un objet
- **Ligne 778** : `cachedChannels?.find(...)` -- echoue car `.find` n'existe pas sur un objet
- **Ligne 804** : `setQueryData(['channels', serverId], updatedChannels)` -- ecrase le cache avec un tableau au lieu de l'objet attendu

Le cache corrompu fait crasher le composant `ChannelList`, ce qui peut declencher l'erreur.

### Correction

Reecrire le `onMutate` pour manipuler la bonne structure :

1. Typer `previousChannels` comme `{ categories: [...], orphanChannels: [...] }`
2. Chercher le salon original dans `categories[].channels` et `orphanChannels`
3. Inserer le doublon temporaire dans la bonne categorie ou dans les orphelins
4. Decaler les positions des salons suivants dans le meme groupe
5. Remettre le resultat dans la bonne structure via `setQueryData`

## Probleme 2 : L'icone ne se met pas a jour instantanement

Le fichier `useChannelSettings.ts` contient deja les mises a jour optimistes correctes pour `icon_url` (lignes 87 et 109). Le probleme restant est que le composant `ChannelOverview` ne re-synchronise pas son etat local avec le prop `channel` apres la sauvegarde.

Quand l'utilisateur sauvegarde, le cache se met a jour (optimiste), mais le composant `ChannelOverview` garde son ancien etat local (`iconUrl` initialise une seule fois au montage via `useState`). Si le composant re-recoit le prop `channel` mis a jour via `useChannelDetails`, les `useState` ne se reinitialiseront pas.

Cependant, le vrai flux est : l'utilisateur change l'icone localement -> clique "Enregistrer" -> le `mutateAsync` envoie `icon_url` -> `onMutate` met a jour le cache `channels` -> la sidebar devrait refleter le changement.

Apres examen detaille, le `onMutate` dans `useChannelSettings.ts` est correct. Le probleme est probablement que le composant `ChannelSettingsModal` utilise `useChannelDetails` pour obtenir l'objet `channel`, mais la sidebar utilise `useChannels` (le cache `['channels', serverId]`). Les deux caches sont mis a jour. La sidebar devrait donc se mettre a jour.

Verification supplementaire : le `ChannelList` lit bien `icon_url` depuis les donnees du cache `channels`. Cela fonctionne. Possibilite que le probleme soit lie au fait que `onSettled` invalide les queries et re-fetch les donnees du serveur, ecrasant temporairement le cache. Mais cela ne devrait pas poser de probleme si le serveur a bien recu la mise a jour.

Conclusion : le bug d'icone peut etre un effet secondaire du bug de duplication (cache corrompu) ou un probleme de timing. L'ajout d'un `invalidateQueries` sur `['channels', serverId]` dans le `onSettled` du `useUpdateChannel` est deja present (ligne 134).

## Fichier a modifier

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useChannels.ts` | Reecrire le `onMutate` de `useDuplicateChannel` (lignes 767-808) pour utiliser la structure `{ categories, orphanChannels }` |

## Detail technique

### Nouveau `onMutate` (lignes 767-808)

```text
onMutate: async ({ channelId, serverId }) => {
  await queryClient.cancelQueries(...)
  
  const previousChannels = queryClient.getQueryData(['channels', serverId])
    as { categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] } | undefined;
  const previousServers = queryClient.getQueryData(['servers']);

  if (previousChannels) {
    // Chercher l'original dans categories ou orphanChannels
    let original: ChannelWithCategory | undefined;
    for (const cat of previousChannels.categories) {
      original = cat.channels.find(ch => ch.id === channelId);
      if (original) break;
    }
    if (!original) {
      original = previousChannels.orphanChannels.find(ch => ch.id === channelId);
    }

    if (original) {
      const newPosition = (original.position ?? 0) + 1;
      const tempId = `temp-dup-${Date.now()}`;
      const tempChannel = { ...original, id: tempId, position: newPosition };

      // Fonction pour decaler et inserer dans un tableau de channels
      const shiftAndInsert = (channels, categoryId) => {
        // Seulement si c'est le bon groupe
        if (original.category_id !== categoryId) return channels;
        const shifted = channels.map(ch =>
          ch.id !== channelId && (ch.position ?? 0) >= newPosition
            ? { ...ch, position: (ch.position ?? 0) + 1 }
            : ch
        );
        shifted.push(tempChannel);
        return shifted.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      };

      if (original.category_id) {
        // Inserer dans la bonne categorie
        queryClient.setQueryData(['channels', serverId], {
          categories: previousChannels.categories.map(cat => ({
            ...cat,
            channels: cat.id === original.category_id
              ? shiftAndInsert(cat.channels, original.category_id)
              : cat.channels
          })),
          orphanChannels: previousChannels.orphanChannels
        });
      } else {
        // Inserer dans les orphelins
        const shifted = previousChannels.orphanChannels.map(ch =>
          ch.id !== channelId && (ch.position ?? 0) >= newPosition
            ? { ...ch, position: (ch.position ?? 0) + 1 }
            : ch
        );
        shifted.push(tempChannel);
        shifted.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
        queryClient.setQueryData(['channels', serverId], {
          categories: previousChannels.categories,
          orphanChannels: shifted
        });
      }
    }
  }

  return { previousChannels, previousServers, serverId };
}
```

Cette correction garantit que le cache garde la bonne structure et que l'interface ne crashe plus lors de la duplication.
