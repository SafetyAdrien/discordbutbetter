

# Écran de chargement intelligent avec attente des données critiques

## Objectif

Remplacer le chargement minimal actuel (auth + serveurs) par un chargement complet qui attend toutes les données critiques avant d'afficher l'app, avec adaptation à la vitesse de connexion.

## Approche

### 1. Modifier `Index.tsx` — Attendre les données critiques

Actuellement, le loading gate est :
```
if (authLoading || (user && serversPending)) → LoadingScreen
```

Il faut étendre ce gate pour attendre aussi :
- `channels` (isPending)
- `members` (isPending)  
- `messages` du canal actif (isPending)

On extrait `isPending` de chaque hook déjà utilisé (`useChannels`, `useMembers`, `useMessages`) et on combine :

```typescript
const { data: channelsData, isPending: channelsPending } = useChannels(activeServerId, initialChannelsData);
const { data: messages = [], isPending: messagesPending } = useMessages(activeChannelId);
const { data: members = [], isPending: membersPending } = useMembers(activeServerId);

const dataStillLoading = user && (
  serversPending || 
  (activeServerId && channelsPending) ||
  (activeServerId && membersPending) ||
  (activeChannelId && messagesPending)
);

if (authLoading || dataStillLoading) {
  return <LoadingScreen />;
}
```

**Problème** : les hooks `useChannels`, `useMembers`, `useMessages` sont appelés APRÈS le gate actuel (ligne 183-185), donc ils ne sont jamais exécutés pendant le loading. Il faut déplacer ces hooks AVANT le gate, ce qui est possible car les hooks React doivent toujours être appelés (pas de retour conditionnel avant eux).

### 2. Modifier `LoadingScreen` — Étapes de progression + adaptation connexion

Transformer le composant pour accepter des props indiquant l'état de chaque étape :

```typescript
interface LoadingScreenProps {
  steps?: {
    auth: boolean;      // true = done
    servers: boolean;
    channels: boolean;
    members: boolean;
    messages: boolean;
  };
}
```

Afficher une progression visuelle basée sur les étapes complétées (ex: 0/5 → 5/5).

**Adaptation à la vitesse de connexion** : mesurer le temps écoulé depuis le mount. Si > 3s, afficher un message supplémentaire type "Connexion lente détectée..." pour informer l'utilisateur.

### 3. Durée minimum garantie

Ajouter un `minLoadingDone` state avec un timer de 1.5s pour que l'écran reste visible assez longtemps pour lire la phrase et l'astuce.

## Fichiers modifiés

| Fichier | Modification |
|---|---|
| `src/pages/Index.tsx` | Déplacer hooks data avant le gate, étendre le gate avec isPending de channels/members/messages, passer les steps au LoadingScreen, ajouter minLoadingDone |
| `src/components/LoadingScreen.tsx` | Accepter props `steps`, afficher barre de progression réelle (étapes), détecter connexion lente (>3s) |
| `src/components/mobile/MobileLayout.tsx` | Même pattern si un loading gate existe là-bas |

