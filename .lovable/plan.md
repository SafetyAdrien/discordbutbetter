

## Plan: Afficher les personnes en vocal dans le tooltip du serveur

### Approche

Créer un hook `useServerVoiceParticipants` qui récupère tous les participants vocaux d'un serveur (via la jointure `voice_states → channels → server_id`), puis enrichir le `TooltipContent` du serveur pour afficher une liste compacte (2-3 avatars + "+N encore").

### Fichiers à modifier/créer

**1. `src/hooks/useServerVoiceParticipants.ts`** (nouveau)
- Query : `voice_states` avec join sur `channels` filtré par `server_id`, + join sur `profiles` pour avatar/nom
- `refetchInterval: 15_000` (polling léger, pas besoin de realtime ici car c'est juste un tooltip)
- `staleTime: 10_000`
- Retourne `{ participants: { user_id, display_name, avatar_url }[], count: number }`

**2. `src/components/layout/ServerList.tsx`**
- Importer le nouveau hook dans `SortableServerIcon`
- Modifier le `TooltipContent` (ligne 154-156) pour afficher sous le nom du serveur :
  - Si `count > 0` : une ligne avec 2-3 mini-avatars (16×16) + noms, et si plus de 3 : `+N en vocal`
  - Si `count === 0` : rien de plus (comportement actuel)
- Layout du tooltip : nom du serveur en haut, puis un séparateur fin, puis la liste compacte des participants vocaux avec une petite icône 🔊

### Rendu visuel attendu

```text
┌──────────────────────┐
│ Mon Serveur          │
│ ─────────────────    │
│ 🔊 En vocal :        │
│ 🟢 Alice, Bob        │
│    +3 en vocal       │
└──────────────────────┘
```

### Détails techniques
- Le hook utilise une seule requête SQL avec jointure pour éviter N+1
- Le polling à 15s est suffisant pour un tooltip (pas critique en temps réel)
- Le hook n'est activé que quand le serveur existe (`enabled: !!serverId`)
- Les avatars sont affichés en stack (overlap) style Discord

