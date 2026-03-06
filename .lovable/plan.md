

# Préchargement des images des messages

## Constat

Les messages sont déjà préchargés dans le `queryClient` et `sessionStorage`, mais les **images attachées** aux messages ne sont pas préchargées dans le cache du navigateur. Résultat : après le loading screen, les images affichent un placeholder animé (`animate-pulse`) le temps du téléchargement réseau.

## Solution

Ajouter une étape de **prefetch des images** dans le preloader. Après le chargement des messages (serveur + DM + threads), extraire toutes les URLs d'images des `attachments` et les précharger via `new Image().src` pour les mettre en cache navigateur.

## Fichier modifié : `src/hooks/usePreloader.ts`

Après `Promise.all([serverMsgPromise, dmMsgPromise, threadMsgPromise, threadsPromise, pollsPromise])` (ligne 515), ajouter une phase de prefetch images :

```ts
// Extract image URLs from all loaded messages
const imageUrls = new Set<string>();

// From server messages
for (const chId of channelIdsToLoad) {
  const msgs = queryClient.getQueryData(['messages', chId]) as any[];
  msgs?.forEach(msg => {
    (msg.attachments || []).forEach((a: any) => {
      if (a.type === 'image' && a.url) imageUrls.add(a.url);
    });
  });
}

// From DM messages
const conversations = queryClient.getQueryData(['dm-conversations']) as any[];
conversations?.forEach(conv => {
  const msgs = queryClient.getQueryData(['dm-messages', conv.id]) as any[];
  msgs?.forEach(msg => {
    (msg.attachments || []).forEach((a: any) => {
      if (a.type === 'image' && a.url) imageUrls.add(a.url);
    });
  });
});

// Prefetch all images into browser cache (fire-and-forget)
imageUrls.forEach(url => {
  const img = new Image();
  img.src = url;
});
```

Ce prefetch est **fire-and-forget** — il ne bloque pas le loading screen. Les images commencent à se télécharger en arrière-plan et seront déjà dans le cache HTTP du navigateur quand l'utilisateur naviguera vers un salon contenant des images.

## Impact

- Les images des 30 derniers salons visités + premiers salons de chaque serveur + tous les DMs apparaîtront **instantanément** sans placeholder
- Aucun impact sur le temps de chargement initial (non-bloquant)
- Les avatars des auteurs de messages sont déjà gérés par le prefetch des membres

