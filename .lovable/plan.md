
Objectif: corriger définitivement le cas “aucune mise à jour connect/déconnect sans CTRL+F5” en combinant optimistic update + realtime fiable partout sur les participants vocaux.

1) Diagnostic confirmé (cause principale)
- Le hook `useVoiceParticipants` est monté à plusieurs endroits (sidebar `ChannelList` + vue vocale).
- Il utilise un nom de canal realtime déterministe: `voice-participants:${channelId}`.
- Le client realtime réutilise un canal existant si le topic est identique; quand un composant se démonte et fait `removeChannel`, il coupe la subscription partagée des autres composants.
- Résultat: plus d’événements INSERT/DELETE reçus jusqu’au refresh complet.

2) Correctifs à implémenter

A. Isoler les subscriptions realtime par instance de hook (critique)
- Fichier: `src/hooks/useVoiceParticipants.ts`
- Générer un `instanceId` stable par hook (`useRef`).
- Utiliser un topic unique, ex: `voice-participants:${channelId}:${instanceId}`.
- Ainsi, chaque composant gère son propre canal; un unmount n’éteint plus les autres abonnements.

B. INSERT 100% optimiste d’abord, hydratation profil ensuite
- Fichier: `src/hooks/useVoiceParticipants.ts`
- Sur `INSERT`, ajouter immédiatement le participant au cache avec `payload.new` (sans dépendre d’un fetch immédiat).
- Fournir un profil fallback minimal (display_name non vide) pour rendu instantané.
- Lancer ensuite un fetch profil ciblé, puis patcher l’entrée.
- En cas d’échec fetch/hydratation: refetch ciblé du seul query key `['voice-participants', channelId]` (léger, non global).

C. Robustesse realtime: gestion d’état de subscription + fallback actif
- Fichier: `src/hooks/useVoiceParticipants.ts`
- Utiliser callback de `.subscribe((status) => ...)`.
- Si `CHANNEL_ERROR` / `TIMED_OUT` / `CLOSED`: activer un fallback `refetchInterval` court (ex. 3–5s) uniquement pour ce channel.
- Quand `SUBSCRIBED`: désactiver fallback et faire un refetch de resync unique.

D. Optimistic cross-cache lors du move/join pour éliminer les résidus locaux
- Fichier: `src/contexts/VoiceContext.tsx`
- Avant d’ajouter l’utilisateur au nouveau channel, retirer optimistiquement cet utilisateur de tous les caches `voice-participants` connus.
- Puis ajouter au cache du channel cible.
- Garder les updates realtime pour les autres utilisateurs.

3) Détails techniques (implémentation)
- `useVoiceParticipants`:
  - conserver `staleTime` + `refetchOnWindowFocus: false`.
  - conserver `DELETE` immédiat par `user_id` + `id`.
  - dédupliquer strictement à l’ajout (`user_id` prioritaire).
- `VoiceContext`:
  - conserver leave optimiste immédiat.
  - éviter toute invalidation globale `['voice-participants']`; uniquement ciblée si nécessaire.

4) Validation E2E (obligatoire)
- Test A/B (2 sessions):
  1. A rejoint vocal → B voit A en &lt;1s sans refresh (sidebar + vue vocale).
  2. A quitte vocal → B voit disparition en &lt;1s sans refresh.
  3. B rejoint/quitte rapidement plusieurs fois (stress test) → aucun “ghost”.
  4. Fermer onglet A brutalement → nettoyage visible côté B.
  5. Simuler perte/reprise réseau → resync automatique sans CTRL+F5.

5) Fichiers à modifier
- `src/hooks/useVoiceParticipants.ts` (principal: isolation channel, optimistic INSERT, fallback realtime)
- `src/contexts/VoiceContext.tsx` (optimistic cross-cache move/join)
