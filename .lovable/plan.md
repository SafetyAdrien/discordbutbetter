# Plan

## 1. Polls — Modification stricte via bouton "Modifier"

Dans `src/components/chat/PollDisplay.tsx` :

- Après vote, l'utilisateur voit **uniquement les résultats**. Cliquer sur une option n'a **aucun effet** tant que le mode édition n'est pas activé.
- Le bouton **"Modifier"** (déjà à côté de "Terminer") devient l'unique porte d'entrée pour changer son vote.
- Au clic sur "Modifier" :
  - `isEditing = true`
  - Pré-remplir `selectedOptions` avec les votes actuels (ne plus les vider via `removeVote`)
  - Afficher **"Confirmer"** et **"Annuler"** (annuler = retour résultats sans toucher les votes)
- Handler de clic sur option : ne s'exécute que si `(!hasVoted || isEditing) && !isExpired && !poll.is_closed`.
- À "Confirmer" : diff entre `selectedOptions` et `userVotes` → appliquer ajouts/suppressions optimistes, `isEditing = false`.

## 2. Présence — bascule automatique Desktop + Mobile, temps réel

Modifier `src/hooks/usePresence.ts` :

Règles :
- **Online** sans activité → **Idle** (timeout actuel) → **Offline** après **2 min** supplémentaires.
- **DND** (manuel) sans activité pendant **5 min** → **Offline**.
- **Idle manuel** : inchangé, pas de timeout offline, pas de texte ajouté.
- À la moindre activité après bascule auto en offline/idle, retour **Online** (sauf si statut manuel `dnd`/`idle`).

Implémentation Desktop + Mobile (temps réel, instantané) :
- Constantes : `IDLE_TO_OFFLINE_TIMEOUT = 2*60*1000`, `DND_TO_OFFLINE_TIMEOUT = 5*60*1000`.
- Refs : `offlineTimerRef`, `dndOfflineTimerRef`, `isManualIdleRef`.
- Étendre `ACTIVITY_EVENTS` pour couvrir le mobile : ajouter `touchmove`, `touchend`, `pointerdown`, `pointermove`, `focus` (window) et `pageshow`. Conserver `{ passive: true }`.
- Étendre `setManualStatus` pour distinguer idle manuel vs auto (`isManualIdleRef`).
- Sur transition auto vers `idle` : démarrer `offlineTimerRef` (2 min) → `updateStatus('offline')`. Clear sur activité ou changement de statut manuel.
- Sur statut `dnd` actif : démarrer `dndOfflineTimerRef` (5 min) basé sur `lastActivityRef`, reset à chaque activité ; au déclenchement → `updateStatus('offline', true)`.
- `handleActivity` :
  - clear `offlineTimerRef` et `dndOfflineTimerRef`
  - si statut courant `offline` (et pas manuel) → retour `online`
  - si `idle` non manuel → retour `online`
- `visibilitychange` et `pagehide` (mobile/iOS) : déclencher la logique d'inactivité immédiatement (timer raccourci comme aujourd'hui pour `hidden`). Sur `pagehide`, envoyer un PATCH `offline` keepalive (comme `beforeunload`) pour couvrir la fermeture mobile.
- Tous les changements de statut passent déjà par `updateProfile` → propagation temps réel instantanée via les souscriptions Realtime existantes sur `profiles` (utilisé partout — `StatusIndicator`, listes, profils). Aucun changement Realtime requis.

## Fichiers touchés
- `src/components/chat/PollDisplay.tsx`
- `src/hooks/usePresence.ts`
