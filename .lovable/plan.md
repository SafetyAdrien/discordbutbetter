# Plan — Vérification voice_signals (3 scénarios + comparatif audience)

## Confirmé en audit (avant test)

- **Salon vocal** → `voice_signals.channel_id = channels.id` → policy stricte `has_channel_permission(channel_id, 'connect_voice')` ✅ alignée.
- **DM** → `dm_call_signals`, table dédiée, hors scope.
- **Stage** → `useStageWebRTC.ts:112` passe `sessionId` (`stage_sessions.id`) en `channel_id` à `SignalingService`. La policy stricte appelle `has_channel_permission` sur cet UUID → retourne `false` → **toute insertion `voice_signals` côté Stage est rejetée** (speaker ET audience).

Conséquence côté audience : WebRTC nécessite un échange offer/answer/ICE même pour un peer purement receveur. Si le signaling de l'audience est bloqué, **l'audience n'entend rien** — pas seulement "ne peut pas parler".

## Scénarios de test

### Scénario 1 — Salon vocal standard
A et B rejoignent un salon `type=voice`. Attendu : tous les POST `/voice_signals` en 201, échange ICE/SDP complet, audio bidirectionnel OK.

### Scénario 2 — Stage speaker + audience (état actuel)
- A démarre une `stage_session`, passe `speaker`.
- B rejoint en `audience`.
- Capture du premier POST `/voice_signals` côté A **et** côté B.
- Attendu actuel : 403/42501 des deux côtés → confirme la régression.
- **Vérification audio explicite côté B (audience)** : capture des connexion-states de `RTCPeerConnection` et vérifie qu'aucun `remote audio track` n'arrive (la cible du test, c'est ça — pas juste le code HTTP).

### Scénario 3 — Stage speaker ↔ speaker
A et B tous deux speakers. Vérifie le P2P entre speakers.

## Décision migration : NE PAS écrire de SQL maintenant

Si Stage est confirmé KO, on **repasse en plan** avec les résultats avant d'écrire la migration. Deux variantes à comparer en test, pas à choisir à l'aveugle :

### Variante A — Permissive (audience peut signaler)
```sql
WITH CHECK (
  auth.uid() = from_user_id
  AND (
    has_channel_permission(auth.uid(), channel_id, 'connect_voice')
    OR EXISTS (
      SELECT 1 FROM public.stage_sessions s
      WHERE s.id = voice_signals.channel_id
        AND has_channel_permission(auth.uid(), s.channel_id, 'connect_voice')
    )
  )
);
```

### Variante B — Stricte (signaling réservé speaker/moderator)
Comme A, mais avec jointure `stage_participants` filtrant `role IN ('speaker','moderator')` sur la branche Stage.

### Test comparatif (après confirmation Stage KO)
Appliquer A **en sandbox locale du test** (via une migration temporaire ou un toggle de policy dans un schéma de test), rejouer Scénarios 2 et 3, mesurer :
- Audio reçu côté audience (oui/non) sous A.
- Audio reçu côté audience sous B (en bloquant son signaling sortant).
- Risque d'abus identifié sous A (audience peut-elle spammer des signaux non sollicités vers speakers ?).

Décision finale tranchée sur la base de ces mesures, pas sur une hypothèse.

## Méthode de test (Playwright)

- 2 contextes browser headless, sessions Supabase injectées.
- Hooks console + response sur `/rest/v1/voice_signals`.
- Pour Stage : instrumentation supplémentaire des `RTCPeerConnection.connectionState` et présence/absence de `RTCRtpReceiver` audio actif côté audience.
- Snapshot DB après chaque phase.
- Si une seule session Supabase injectée → STOP, demander un 2e compte de test.

## Sortie

Rapport en chat (pas de SQL appliqué) :
- Matrice 3 scénarios × {HTTP signaling, ICE complet, audio bidirectionnel, audio reçu audience}.
- Recommandation A vs B argumentée par les mesures du test comparatif.
- Demande de validation explicite avant d'écrire la migration corrective.

Approuvé : je passe en build mode pour exécuter les 3 scénarios + comparatif A/B, puis je reviens en plan avec les résultats.