
# Chargement Immédiat des Salons lors du Changement de Serveur

## Problème identifié
Lors du changement de serveur, l'utilisateur observe un délai avant l'affichage des salons. Ce délai est causé par :

1. **Requêtes dupliquées** : `useServers` charge déjà les catégories et salons imbriqués pour chaque serveur, mais `useChannels` effectue une requête séparée à la base de données
2. **Pas de données initiales** : `useChannels` ne profite pas des données déjà présentes dans le cache de `useServers`
3. **staleTime: 0** : Force un refetch même si les données sont déjà en cache

---

## Solution proposée

### Stratégie : Initialisation du cache avec `initialData`

Utiliser les données déjà chargées par `useServers` comme `initialData` pour `useChannels`, permettant un affichage **immédiat** lors du changement de serveur.

---

## Modifications

### 1. Hook useChannels.ts

**Ajouter un paramètre optionnel `initialData`** pour permettre l'injection des données depuis `useServers` :

```typescript
export function useChannels(
  serverId: string | null, 
  initialData?: { categories: CategoryWithChannels[]; orphanChannels: OrphanChannel[] }
) {
  // ... existing code ...

  return useQuery({
    queryKey: ['channels', serverId],
    queryFn: async () => { /* ... */ },
    enabled: !!serverId && !!user,
    // NEW: Use initial data from servers cache for instant display
    initialData: initialData,
    // Prevent refetch if we have initial data (refetch happens via Realtime)
    staleTime: initialData ? 30000 : 0,
  });
}
```

### 2. Page Index.tsx

**Extraire les données du cache `servers`** et les passer à `useChannels` :

```typescript
// Prepare initial channels data from servers cache (instant display)
const initialChannelsData = useMemo(() => {
  if (!activeServerId) return undefined;
  const server = servers.find(s => s.id === activeServerId);
  if (!server) return undefined;
  
  return {
    categories: server.categories.map(cat => ({
      id: cat.id,
      name: cat.name,
      position: cat.position ?? 0,
      channels: cat.channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type as ChannelType,
        description: ch.description ?? null,
        position: ch.position ?? 0,
        category_id: cat.id,
        server_id: activeServerId,
      })),
    })),
    orphanChannels: (server.orphanChannels || []).map(ch => ({
      ...ch,
      type: ch.type as ChannelType,
    })),
  };
}, [activeServerId, servers]);

// Use channels with initial data for instant display
const { data: channelsData } = useChannels(activeServerId, initialChannelsData);
```

---

## Flux de données optimisé

```text
┌────────────────────────────────────────────────────────────────┐
│                    Changement de serveur                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  1. servers.find(s => s.id === activeServerId)                 │
│     → Données déjà en cache (chargées au démarrage)            │
│     → Affichage IMMÉDIAT                                       │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  2. useChannels reçoit initialData                             │
│     → Pas de requête réseau immédiate                          │
│     → staleTime: 30s évite refetch inutile                     │
└────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────────┐
│  3. Realtime subscription active                               │
│     → Mise à jour en temps réel si changements                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/hooks/useChannels.ts` | Ajouter paramètre `initialData` + ajuster `staleTime` dynamiquement |
| `src/pages/Index.tsx` | Préparer `initialChannelsData` depuis le cache `servers` et le passer à `useChannels` |

---

## Résultat attendu

- **Avant** : Délai de 100-500ms lors du changement de serveur (requête réseau)
- **Après** : Affichage **instantané** des salons (données déjà en mémoire)
- Les mises à jour en temps réel (Realtime) continuent de fonctionner normalement
- Les mutations locales (création/suppression) restent instantanées grâce aux optimistic updates

---

## Notes techniques

- Cette approche suit le pattern recommandé par React Query pour les données imbriquées
- Le `staleTime: 30000` (30 secondes) évite les refetch inutiles tout en permettant les mises à jour Realtime
- Les abonnements Realtime dans `useChannels` invalideront le cache si des changements surviennent depuis d'autres clients
