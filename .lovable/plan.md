

## Plan: Corriger la suppression en temps réel dans le tooltip serveur

### Problème

Le handler `DELETE` dans `useServerVoiceParticipants` utilise `payload.old.user_id` pour retirer le participant du cache. Cependant, par défaut Supabase Realtime n'envoie que la clé primaire (`id`) dans `payload.old` lors d'un DELETE. Le champ `user_id` est donc `undefined`, et le `filter` ne retire personne.

### Correction

**1. Migration SQL** : Activer `REPLICA IDENTITY FULL` sur la table `voice_states` pour que Realtime envoie toutes les colonnes (dont `user_id`) dans le payload DELETE.

```sql
ALTER TABLE public.voice_states REPLICA IDENTITY FULL;
```

**2. Ajouter un polling de secours** dans `useServerVoiceParticipants.ts` (`refetchInterval: 15_000`) pour rattraper tout événement raté.

### Fichiers modifiés
- Migration SQL (replica identity)
- `src/hooks/useServerVoiceParticipants.ts` (ajout refetchInterval)

