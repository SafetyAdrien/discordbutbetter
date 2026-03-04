
## Plan de correction: départ vocal non reflété dans le tooltip serveur

### Diagnostic (cause probable)
Le hook `useServerVoiceParticipants` retire un utilisateur uniquement avec `payload.old.user_id` sur `DELETE`.
Or, selon les conditions Realtime/RLS, le payload `DELETE` peut parfois ne contenir que `id` (même si `REPLICA IDENTITY FULL` est activé).  
Résultat: le filtre ne matche pas, donc l’utilisateur reste affiché.

### Modifications à implémenter

#### 1) Rendre la suppression robuste côté hook
**Fichier:** `src/hooks/useServerVoiceParticipants.ts`

- Étendre `ServerVoiceParticipant` avec `id`.
- Inclure `id` dans la query initiale sur `voice_states`.
- Dans le handler `DELETE`, retirer avec fallback double:
  - `p.user_id !== old.user_id`
  - **et** `p.id !== old.id`
- Si le payload est incomplet, déclencher un `invalidateQueries(['server-voice-participants', serverId])` pour resynchroniser immédiatement.

#### 2) Fiabiliser l’ajout instantané
Toujours conserver `id` provenant de `payload.new.id` lors du `INSERT` pour que le fallback par `id` fonctionne dans tous les cas.

#### 3) Sécuriser les cas non couverts
Ajouter un fallback léger:
- Sur `UPDATE` (ou payload ambigu), forcer une resync du query du serveur concerné.
- Conserver le `refetchInterval` actuel comme filet de sécurité.

### Pourquoi cette correction fonctionne
On n’est plus dépendant d’un seul champ (`user_id`) dans `DELETE`.  
Même si Realtime n’envoie que `id`, le participant sera retiré instantanément du cache local, puis resynchronisé si nécessaire.

### Fichiers impactés
- `src/hooks/useServerVoiceParticipants.ts` (unique point de correction)

### Vérification après implémentation
1. Ouvrir 2 comptes sur le même serveur.
2. Compte B rejoint un vocal → badge + tooltip se mettent à jour instantanément.
3. Compte B quitte le vocal → disparition immédiate dans tooltip + badge.
4. Répéter plusieurs fois (join/leave rapide) pour valider qu’aucun “participant fantôme” ne reste affiché.
