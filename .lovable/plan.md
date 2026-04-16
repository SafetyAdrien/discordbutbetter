
# Correctif réel à appliquer pour l’icône de salon

## Problème réellement constaté

La correction n’a pas été appliquée au bon endroit.

Le hook `useUpdateChannel` contient déjà `icon_url` dans ses updates optimistes. Le vrai blocage vient de `src/pages/Index.tsx` :

- `ChannelList` reçoit `serverForChannelList`
- `serverForChannelList.categories[].channels` est reconstruit sans `icon_url`
- donc même si `ChannelList.tsx` sait afficher `channel.icon_url`, cette donnée n’arrive jamais jusqu’à lui

En plus, l’état courant du salon (`activeChannel`) est encore lu depuis `activeServer.categories`, donc certaines vues restent dépendantes d’un cache partiel.

## Correctif à faire

### 1. Corriger `src/pages/Index.tsx`
Inclure `icon_url` lors de la construction de `serverForChannelList` :

- dans `categories.map(...).channels.map(...)`
- garder aussi `icon_url` pour tous les salons passés à la sidebar

Exemple visé :
```ts
channels: cat.channels.map(ch => ({
  id: ch.id,
  name: ch.name,
  type: ...,
  description: ch.description ?? undefined,
  icon_url: ch.icon_url ?? null,
}))
```

### 2. Stabiliser la source de vérité de la sidebar
Vérifier que `ChannelList` continue bien d’utiliser :
- `serverForChannelList.categories`
- `orphanChannels` passés séparément

Le composant `ChannelList.tsx` est déjà prêt à afficher :
```tsx
channel.icon_url ? <img ... /> : <DefaultIcon ... />
```
Donc pas besoin de refaire la logique visuelle, seulement s’assurer que la donnée arrive correctement.

### 3. Corriger aussi les données dérivées dans `Index.tsx`
Mettre à jour les objets dérivés qui reconstruisent les salons depuis `activeServer` sans `icon_url`, pour éviter les incohérences après sauvegarde :

- `serverForChannelList`
- si nécessaire, les structures liées à la navigation/recherche qui repartent de `activeServer.categories`

### 4. Vérifier la cohérence mobile
Le mobile lit `rawServers`, donc il faut contrôler que les structures reconstruites côté mobile n’écrasent pas `icon_url` si la liste des salons mobile doit aussi refléter les icônes personnalisées.

## Résultat attendu

Après sauvegarde d’une icône de salon :
- l’icône se met à jour immédiatement dans les paramètres du salon
- la liste des salons desktop se met à jour immédiatement
- les salons orphelins restent cohérents
- les vues dérivées n’écrasent plus `icon_url`

## Fichiers à modifier
- `src/pages/Index.tsx`
- éventuellement `src/components/mobile/MobileServersView.tsx` si la vue mobile doit aussi refléter cette donnée immédiatement

## Détail technique
Le bug n’est pas dans `ChannelList.tsx` ni principalement dans `useChannelSettings.ts`, mais dans le mapping intermédiaire de `Index.tsx` qui supprime `icon_url` avant rendu.
