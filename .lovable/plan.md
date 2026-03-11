

# Refactorisation technologique : IndexedDB, Canvas API, WebAssembly

## Vue d'ensemble

Trois axes de travail pour aligner l'application sur les technologies modernes de Discord :
1. Migrer le cache sessionStorage vers IndexedDB (32 fichiers impactés)
2. Ajouter des effets visuels via Canvas API
3. Etendre l'usage de WebAssembly pour le traitement media

---

## 1. Migration IndexedDB

### Nouveau fichier : `src/lib/cache.ts`

Couche d'abstraction IndexedDB avec API async simple :
- `cacheGet(key)` / `cacheSet(key, value)` / `cacheDelete(key)` / `cacheClear()`
- Base de données `app-cache`, object store `kv`
- Fallback silencieux sur sessionStorage si IndexedDB indisponible (navigation privee)
- TTL optionnel par entree

### Migration des 32 hooks

Remplacer le pattern synchrone :
```ts
// AVANT
placeholderData: () => {
  const cached = sessionStorage.getItem(`cache:...`);
  return cached ? JSON.parse(cached) : undefined;
}
// + useEffect pour persister
```

Par le pattern async IndexedDB :
```ts
// APRES
const [cached, setCached] = useState();
useEffect(() => { cacheGet('messages:' + id).then(setCached); }, [id]);
// placeholderData utilise cached
// useEffect persiste via cacheSet
```

Hooks concernes (tous dans `src/hooks/`) :
- useMessages, useThreadMessages, useDMMessages
- useChannels, useCategories, useChannelSettings
- useMembers, useRoles, usePermissions
- useServers, useServerAssets, useServerSettings
- useChannelUnreadCounts, useThreadUnreadCounts, useServerUnreadCounts
- usePinnedMessages, useDMPinnedMessages
- useNotifications, useInvites, useWebhooks
- useFollowedThreads, useUserChannelSettings
- useEngagementStats, useAuditLogs
- useFriends, useDMs, useProfile
- useChannelPermissions, useCategoryPermissions
- useAnnouncements, useMediaPosts

### Nettoyage
- Supprimer tous les `sessionStorage.getItem/setItem` du cache de donnees
- Garder localStorage pour les preferences utilisateur legeres (theme, layout)

---

## 2. Canvas API - Effets visuels

### Nouveau fichier : `src/components/effects/ConfettiCanvas.tsx`
- Canvas plein ecran en overlay (pointer-events: none)
- Animation de confettis declenchee par evenements (boost serveur, nouveau membre)
- RequestAnimationFrame pour performance
- Auto-nettoyage apres animation

### Nouveau fichier : `src/components/effects/ParticleBackground.tsx`
- Particules subtiles pour l'ecran de chargement ou la page d'authentification
- Rendu Canvas leger avec interpolation

### Integration
- LoadingScreen : fond anime avec particules
- Auth page : effet visuel subtil
- Boost : confettis lors d'un boost serveur

---

## 3. WebAssembly - Extensions

### Nouveau fichier : `src/utils/wasm/ImageCompressor.ts`
- Compression d'images avant upload (avatars, bannieres) via un module Wasm
- Redimensionnement cote client pour reduire la bande passante
- Integration dans les formulaires d'upload existants (avatar, banniere serveur)

### Amelioration : `src/utils/webrtc/AudioProcessor.ts`
- Le traitement RNNoise (Wasm) est deja en place
- Ajouter un compresseur audio Wasm optionnel pour les flux vocaux faible debit

---

## Fichiers crees
- `src/lib/cache.ts` (couche IndexedDB)
- `src/components/effects/ConfettiCanvas.tsx`
- `src/components/effects/ParticleBackground.tsx`
- `src/utils/wasm/ImageCompressor.ts`

## Fichiers modifies
- 32 hooks dans `src/hooks/` (migration sessionStorage → IndexedDB)
- `src/components/LoadingScreen.tsx` (particules)
- `src/pages/Auth.tsx` (particules)

## Ordre d'execution
1. Creer `src/lib/cache.ts`
2. Migrer tous les hooks (par lots)
3. Creer les composants Canvas
4. Creer le compresseur d'images Wasm
5. Integrer les effets visuels

