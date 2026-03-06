

# Corriger la page blanche lors du clic sur un salon (Mobile)

## Problème

Quand `mobileView` est de type `chat`, le composant `renderChannelContent()` retourne `null` si `currentServer` ou `channelForChat` n'est pas encore disponible (données en cours de chargement). L'overlay `motion.div` s'affiche alors vide — page blanche.

Cela arrive principalement :
1. Au rechargement (F5) quand la vue `chat` est restaurée depuis localStorage mais que `rawServers` n'a pas encore chargé
2. Lors d'une navigation rapide entre serveurs/salons

## Solution

### `src/components/mobile/MobileLayout.tsx`

1. Dans `renderChannelContent()`, remplacer le `return null` (ligne 277) par un état de chargement avec un spinner centré (Loader2 + texte)
2. Même traitement pour les `FullScreenWrapper` et la vue voice quand `currentServer` est null

```tsx
// Avant (retourne rien → page blanche)
if (mobileView.type !== 'chat' || !channelForChat || !currentServer) return null;

// Après (affiche un spinner cohérent)
if (mobileView.type !== 'chat') return null;
if (!channelForChat || !currentServer) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-2 flex items-center gap-2 border-b border-border">
        <button onClick={handleBackToChannels} className="p-1.5 rounded-lg hover:bg-muted">
          <ChevronLeftIcon className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}
```

Cela garantit que l'overlay affiche toujours un contenu visible (header + spinner) au lieu d'un fond vide.

