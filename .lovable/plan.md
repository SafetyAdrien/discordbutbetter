

# Correction de 3 bugs

## Bug 1 : Icones personnalisees non visibles dans la liste des salons

**Cause** : Le hook `useServers` charge les serveurs avec leurs salons, mais la requete Supabase ne recupere PAS `icon_url` dans les colonnes des channels (lignes 64-69 de `useServers.ts`). Seuls `id, name, type, description, position` sont selectionnes. La liste des salons affiche donc toujours l'icone par defaut.

**Correction** :
- Ajouter `icon_url` a la sous-requete `channels` dans `useServers.ts` (deux endroits : dans `categories > channels` et dans `channels` directement)
- Ajouter `icon_url` au type `ServerWithDetails` pour les channels dans les categories

## Bug 2 : Le switch off ne supprime pas les majuscules en temps reel

**Cause** : Dans `ChannelOverview.tsx`, la variable `shouldFormatStrict` verifie `channel.type === 'text' || channelType === 'text'`. Or `channelType` n'est initialise qu'avec `'text'` ou `'announcement'` -- pour les salons de type `text`, `channelType` vaut `'text'` et `channel.type === 'text'`, donc ca devrait fonctionner. Le probleme est que `formatStrictChannelName` conserve les caracteres accentues unicode (`\u00C0-\u024F`) mais ne les met pas en minuscules correctement pour certains cas. Cependant le vrai souci est plus probable : la regex `[^a-z0-9\u00C0-\u024F-_]` ne supprime pas les majuscules A-Z puisqu'elles sont d'abord converties par `.toLowerCase()`. Apres verification, le code semble correct. Le bug pourrait etre lie au fait que `serverSettings` n'est pas encore charge quand l'utilisateur tape, donc `isFlexible` reste `true` par defaut. 

Mais en relisant plus attentivement : le `shouldFormatStrict` est `!isFlexible && (channel.type === 'text' || channelType === 'text')`. Si `serverSettings` est `undefined` (pas encore charge), `isFlexible` vaut `true` (defaut), donc le formatage strict n'est pas applique. Une fois charge, il faut que l'utilisateur retape pour que ca prenne effet. Le fix sera de s'assurer que le composant reagit correctement au changement de `shouldFormatStrict`, et aussi d'appliquer le formatage strict au moment du `handleSave` en plus du `onChange`.

En fait, le probleme reel est que le `onChange` applique bien `formatStrictChannelName` quand `shouldFormatStrict` est vrai, MAIS si l'utilisateur a deja tape un nom avec majuscules avant que `shouldFormatStrict` devienne vrai (avant le chargement des settings), le texte n'est pas reformate. Il faut ajouter un `useEffect` pour reformater quand `shouldFormatStrict` change.

**Correction** :
- Ajouter un `useEffect` dans `ChannelOverview` qui reformate le nom quand `shouldFormatStrict` passe a `true`
- Appliquer aussi le formatage strict dans `handleSave` en cas de securite, meme si le nom n'a pas change par rapport a l'original

## Bug 3 : Nouveau salon non visible sans refresh

**Cause** : Incoherence de cles de query entre `useServers` et `useCreateChannel`. `useServers` utilise `['servers', user?.id]` comme query key, mais `useCreateChannel` invalide `['servers']` (sans `user.id`). L'invalidation ne correspond donc pas a la cle du cache, et le cache des serveurs n'est pas rafraichi.

**Correction** :
- Dans `useCreateChannel` (et les autres mutations de `useChannels.ts`), invalider `['servers']` de maniere large en utilisant `{ queryKey: ['servers'] }` -- ceci devrait deja matcher grace au matching partiel de TanStack Query. Verifions... En fait, `invalidateQueries({ queryKey: ['servers'] })` devrait bien matcher `['servers', userId]` car TanStack fait du prefix matching. Mais `useServers` utilise `staleTime` par defaut (pas defini, donc 0), et les donnees viennent peut-etre du Realtime. Le vrai probleme est que `useChannels` a un `staleTime: initialData ? 30000 : 0` et `initialData` provient du cache servers qui ne contient pas le nouveau salon (car le servers cache n'est pas invalide correctement ou le Realtime ne declenche pas la mise a jour).

En fait, le probleme est dans `useCreateChannel.onMutate` : la mise a jour optimiste du cache `['servers']` ne matche pas `['servers', userId]`. Le `queryClient.setQueryData(['servers'], ...)` n'a pas d'effet car la cle reelle est `['servers', userId]`. Meme chose pour `cancelQueries` et `invalidateQueries`.

**Correction** :
- Dans toutes les mutations de `useChannels.ts`, remplacer les references a `['servers']` par un matching partiel. Il suffit d'utiliser `queryKey: ['servers']` avec l'option `exact: false` (comportement par defaut pour `invalidateQueries`) pour l'invalidation, mais pour `setQueryData` il faut la cle exacte. La solution est de passer le `userId` ou d'utiliser `queryClient.getQueryCache().findAll({ queryKey: ['servers'] })` pour trouver la bonne cle.

La solution la plus simple : faire en sorte que les mutations n'essaient plus de mettre a jour optimistiquement le cache `['servers']` (qui est complexe et source de bugs), et se contenter d'invalider avec le bon prefix matching. Ou bien, recuperer la cle exacte du cache.

**Approche retenue** : Changer `useServers` pour utiliser `['servers']` tout court (sans userId) comme queryKey, puisque le hook est deja protege par `enabled: !!user`. Cela alignera toutes les invalidations existantes.

## Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/hooks/useServers.ts` | 1) Ajouter `icon_url` a la requete channels. 2) Changer queryKey de `['servers', user?.id]` a `['servers']` |
| `src/hooks/useChannels.ts` | Aucun changement necessaire (les invalidations utilisent deja `['servers']`) |
| `src/components/channel-settings/ChannelOverview.tsx` | Ajouter un `useEffect` pour reformater le nom quand `shouldFormatStrict` change |

